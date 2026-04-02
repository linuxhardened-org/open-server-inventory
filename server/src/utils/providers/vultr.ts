import { createHash } from 'crypto';
import db from '../../db';
import { emitRealtime } from '../../realtime';
import type { SyncResult } from './registry';

interface VultrInstance {
  id: string;
  label: string;
  main_ip: string;   // public IPv4 (may be "0.0.0.0" if not yet assigned)
  internal_ip: string; // private IPv4
  v6_main_ip: string;  // public IPv6 (empty string if none)
  os: string;
  vcpu_count: number;
  ram: number;       // MB
  region: string;    // e.g. "ewr"
  power_status: string; // "running" | "stopped"
  server_status: string; // "ok" | "installingbooting" etc.
  hostname: string;
}

interface VultrListResponse {
  instances: VultrInstance[];
  meta: {
    total: number;
    links: {
      next: string;
      prev: string;
    };
  };
}

async function fetchAllVultrInstances(apiKey: string): Promise<VultrInstance[]> {
  const all: VultrInstance[] = [];
  let cursor: string | null = null;

  do {
    const url = new URL('https://api.vultr.com/v2/instances');
    url.searchParams.set('per_page', '500');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Vultr API error: ${res.status} — ${body}`);
    }

    const data = await res.json() as VultrListResponse;
    all.push(...(data.instances ?? []));

    // Vultr cursor pagination: next cursor is in meta.links.next as a full URL or token
    const nextLink = data.meta?.links?.next ?? '';
    if (nextLink) {
      try {
        const nextUrl = new URL(nextLink);
        cursor = nextUrl.searchParams.get('cursor');
      } catch {
        // nextLink might be just the cursor token itself
        cursor = nextLink || null;
      }
    } else {
      cursor = null;
    }
  } while (cursor);

  return all;
}

function getInstanceOs(instance: VultrInstance): string {
  const os = instance.os?.toLowerCase() ?? '';
  if (os.includes('windows')) return 'Windows';
  if (os.includes('ubuntu')) return 'Ubuntu';
  if (os.includes('debian')) return 'Debian';
  if (os.includes('centos')) return 'CentOS';
  if (os.includes('fedora')) return 'Fedora';
  if (os.includes('rocky')) return 'Rocky Linux';
  if (os.includes('almalinux') || os.includes('alma linux')) return 'AlmaLinux';
  if (os.includes('freebsd')) return 'FreeBSD';
  if (os.includes('openbsd')) return 'OpenBSD';
  if (os.includes('arch')) return 'Arch Linux';
  // Return the raw OS string (cleaned up) if no match
  return instance.os || 'Linux';
}

function hashInstances(instances: VultrInstance[]): string {
  const sorted = [...instances].sort((a, b) => a.id.localeCompare(b.id));
  const key = sorted.map((i) => `${i.id}:${i.power_status}`).join('|');
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
 * Sync Vultr instances into the server inventory.
 * Credentials: API key stored directly in api_token.
 * Uses cursor-based pagination from Vultr API v2.
 */
export async function syncVultrProvider(
  providerId: number,
  apiToken: string,
  providerName: string,
  storedHash: string | null = null
): Promise<SyncResult> {
  console.log(`[Vultr] ${providerName}: fetching all instances`);
  const allInstances = await fetchAllVultrInstances(apiToken.trim());
  console.log(`[Vultr] ${providerName}: found ${allInstances.length} instances`);

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

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const groupId = await getOrCreateGroup(client, providerName);

    for (const instance of allInstances) {
      const cloudInstanceId = instance.id;
      const name = instance.label || instance.hostname || instance.id;
      const hostname = instance.hostname || name;

      const publicIpv4 = instance.main_ip && instance.main_ip !== '0.0.0.0'
        ? instance.main_ip
        : null;
      const privateIpv4 = instance.internal_ip && instance.internal_ip !== '0.0.0.0'
        ? instance.internal_ip
        : null;
      const publicIpv6 = instance.v6_main_ip && instance.v6_main_ip !== ''
        ? instance.v6_main_ip
        : null;

      const os = getInstanceOs(instance);
      const cpuCores = instance.vcpu_count ?? 0;
      const ramGb = Math.round((instance.ram ?? 0) / 1024);
      const region = instance.region;
      const status = instance.power_status === 'running' ? 'active' : 'inactive';
      const notes = `Region: ${region}`;

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
            os, cpuCores, ramGb, region, status, notes,
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
            os, cpuCores, ramGb, region, status, notes,
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
