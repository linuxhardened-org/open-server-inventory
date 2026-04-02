import { createHash } from 'crypto';
import { JWT } from 'google-auth-library';
import db from '../../db';
import { emitRealtime } from '../../realtime';
import type { SyncResult } from './registry';

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  token_uri: string;
}

interface GcpInstance {
  id: string;
  name: string;
  zone: string; // full URL, e.g. .../zones/us-central1-a
  machineType: string; // full URL, e.g. .../machineTypes/n1-standard-2
  status: string; // RUNNING, TERMINATED, STOPPED, etc.
  networkInterfaces?: Array<{
    networkIP?: string;
    accessConfigs?: Array<{ natIP?: string }>;
    ipv6AccessConfigs?: Array<{ externalIpv6?: string }>;
  }>;
  disks?: Array<{
    licenses?: string[];
  }>;
}

interface MachineTypeSpec {
  guestCpus: number;
  memoryMb: number;
}

function parseServiceAccount(apiToken: string): ServiceAccountKey {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(apiToken);
  } catch {
    throw new Error('GCP credentials must be a service account JSON key file');
  }
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('GCP service account JSON must contain client_email, private_key, and project_id');
  }
  return parsed as unknown as ServiceAccountKey;
}

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const jwt = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/compute.readonly'],
  });
  const token = await jwt.getAccessToken();
  if (!token.token) throw new Error('Failed to obtain GCP access token');
  return token.token;
}

/** Fetch all instances across all zones using aggregatedList (one API call, paginated). */
async function fetchAllInstances(projectId: string, accessToken: string): Promise<GcpInstance[]> {
  const all: GcpInstance[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(projectId)}/aggregated/instances`
    );
    url.searchParams.set('maxResults', '500');
    url.searchParams.set('filter', 'status != TERMINATED');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GCP Compute API error: ${res.status} — ${body}`);
    }

    const data = await res.json() as {
      items?: Record<string, { instances?: GcpInstance[]; warning?: unknown }>;
      nextPageToken?: string;
    };

    for (const zoneData of Object.values(data.items ?? {})) {
      if (zoneData.instances) {
        all.push(...zoneData.instances);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

/** Extract zone name from full zone URL. */
function zoneFromUrl(zoneUrl: string): string {
  return zoneUrl.split('/').pop() ?? zoneUrl;
}

/** Extract machine type name from full URL. */
function machineTypeFromUrl(mtUrl: string): string {
  return mtUrl.split('/').pop() ?? mtUrl;
}

/** Derive region from zone name (e.g. "us-central1-a" → "us-central1"). */
function regionFromZone(zone: string): string {
  return zone.replace(/-[a-z]$/, '');
}

/** Fetch machine type specs for a batch (zone-scoped). */
async function fetchMachineTypeSpecs(
  projectId: string,
  zone: string,
  machineTypes: string[],
  accessToken: string
): Promise<Map<string, MachineTypeSpec>> {
  const specs = new Map<string, MachineTypeSpec>();
  if (machineTypes.length === 0) return specs;

  // Use aggregated machineTypes to avoid per-zone calls
  await Promise.allSettled(
    machineTypes.map(async (mt) => {
      try {
        const url = `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(projectId)}/zones/${encodeURIComponent(zone)}/machineTypes/${encodeURIComponent(mt)}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json() as MachineTypeSpec;
        specs.set(mt, { guestCpus: data.guestCpus ?? 0, memoryMb: data.memoryMb ?? 0 });
      } catch {
        // ignore individual failures
      }
    })
  );

  return specs;
}

/** Determine OS from disk licenses. */
function getInstanceOs(instance: GcpInstance): string {
  const licenses = instance.disks?.flatMap((d) => d.licenses ?? []) ?? [];
  const licenseLower = licenses.join(' ').toLowerCase();
  if (licenseLower.includes('windows')) return 'Windows';
  if (licenseLower.includes('debian')) return 'Debian';
  if (licenseLower.includes('ubuntu')) return 'Ubuntu';
  if (licenseLower.includes('centos')) return 'CentOS';
  if (licenseLower.includes('rhel') || licenseLower.includes('red-hat')) return 'Red Hat Enterprise Linux';
  if (licenseLower.includes('suse')) return 'SUSE Linux';
  if (licenseLower.includes('fedora')) return 'Fedora';
  if (licenseLower.includes('rocky')) return 'Rocky Linux';
  if (licenseLower.includes('almalinux')) return 'AlmaLinux';
  if (licenseLower.includes('cos') || licenseLower.includes('container-optimized')) return 'Container-Optimized OS';
  return 'Linux';
}

function hashInstances(instances: GcpInstance[]): string {
  const sorted = [...instances].sort((a, b) => a.id.localeCompare(b.id));
  const key = sorted.map((i) => `${i.id}:${i.status}`).join('|');
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

async function getOrCreateGroup(client: any, groupName: string): Promise<number> {
  const existing = await client.query('SELECT id FROM groups WHERE name = $1', [groupName]);
  if (existing.rows.length > 0) return existing.rows[0].id;
  const result = await client.query(
    'INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id',
    [groupName, `Auto-created group for ${groupName} cloud servers`]
  );
  return result.rows[0].id;
}

/**
 * Sync GCP Compute Engine instances into the server inventory.
 * Credentials: service account JSON stored as api_token.
 * All zones are discovered via aggregated/instances API — no zone config needed.
 */
export async function syncGcpProvider(
  providerId: number,
  apiToken: string,
  providerName: string,
  storedHash: string | null = null
): Promise<SyncResult> {
  const sa = parseServiceAccount(apiToken);
  const accessToken = await getAccessToken(sa);

  console.log(`[GCP] ${providerName}: fetching all instances in project ${sa.project_id}`);
  const allInstances = await fetchAllInstances(sa.project_id, accessToken);
  console.log(`[GCP] ${providerName}: found ${allInstances.length} instances`);

  const hash = hashInstances(allInstances);

  if (storedHash && hash === storedHash) {
    await db.query(
      'UPDATE cloud_providers SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
      [providerId]
    );
    emitRealtime({
      resource: 'cloud-providers',
      action: 'updated',
      at: new Date().toISOString(),
      id: providerId,
      meta: { providerName, skipped: true },
    });
    return { count: allInstances.length, hash, skipped: true };
  }

  // Fetch machine type specs per zone (batch by zone to minimize API calls)
  const zoneToInstances = new Map<string, GcpInstance[]>();
  for (const instance of allInstances) {
    const zone = zoneFromUrl(instance.zone);
    if (!zoneToInstances.has(zone)) zoneToInstances.set(zone, []);
    zoneToInstances.get(zone)!.push(instance);
  }

  const specsByZone = new Map<string, Map<string, MachineTypeSpec>>();
  await Promise.allSettled(
    [...zoneToInstances.entries()].map(async ([zone, instances]) => {
      const uniqueTypes = [...new Set(instances.map((i) => machineTypeFromUrl(i.machineType)).filter(Boolean))];
      const specs = await fetchMachineTypeSpecs(sa.project_id, zone, uniqueTypes, accessToken);
      specsByZone.set(zone, specs);
    })
  );

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const groupId = await getOrCreateGroup(client, providerName);

    for (const instance of allInstances) {
      const cloudInstanceId = instance.id;
      const name = instance.name;
      const hostname = instance.name;
      const zone = zoneFromUrl(instance.zone);
      const region = regionFromZone(zone);
      const mtName = machineTypeFromUrl(instance.machineType);
      const specs = specsByZone.get(zone)?.get(mtName) ?? { guestCpus: 0, memoryMb: 0 };

      const iface = instance.networkInterfaces?.[0];
      const privateIpv4 = iface?.networkIP ?? null;
      const publicIpv4 = iface?.accessConfigs?.[0]?.natIP ?? null;
      const publicIpv6 = iface?.ipv6AccessConfigs?.[0]?.externalIpv6 ?? null;

      const os = getInstanceOs(instance);
      const status = instance.status === 'RUNNING' ? 'active' : 'inactive';
      const notes = `Type: ${mtName}`;

      const existing = await client.query(
        'SELECT id FROM servers WHERE cloud_provider_id = $1 AND cloud_instance_id = $2',
        [providerId, cloudInstanceId]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE servers SET
            name=$1, hostname=$2,
            ip_address=$3, private_ip=$4, ipv6_address=$5,
            os=$6, cpu_cores=$7, ram_gb=$8, region=$9, status=$10, notes=$11,
            group_id=COALESCE(group_id, $12),
            updated_at=CURRENT_TIMESTAMP
          WHERE id=$13`,
          [
            name, hostname,
            publicIpv4, privateIpv4, publicIpv6,
            os, specs.guestCpus, Math.round(specs.memoryMb / 1024), zone, status, notes,
            groupId, existing.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO servers
            (name, hostname, ip_address, private_ip, ipv6_address,
             os, cpu_cores, ram_gb, region, status, notes,
             cloud_provider_id, cloud_instance_id, group_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            name, hostname,
            publicIpv4, privateIpv4, publicIpv6,
            os, specs.guestCpus, Math.round(specs.memoryMb / 1024), zone, status, notes,
            providerId, cloudInstanceId, groupId,
          ]
        );
      }
    }

    await client.query(
      `UPDATE cloud_providers
         SET last_sync_at = CURRENT_TIMESTAMP, server_count = $1, instance_hash = $2
       WHERE id = $3`,
      [allInstances.length, hash, providerId]
    );

    await client.query('COMMIT');

    emitRealtime({
      resource: 'servers',
      action: 'sync',
      at: new Date().toISOString(),
      meta: { providerId, providerName, syncedCount: allInstances.length },
    });
    emitRealtime({
      resource: 'cloud-providers',
      action: 'updated',
      at: new Date().toISOString(),
      id: providerId,
      meta: { providerName, syncedCount: allInstances.length },
    });

    return { count: allInstances.length, hash, skipped: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
