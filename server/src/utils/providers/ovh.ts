import { createHash } from 'crypto';
import db from '../../db';
import { emitRealtime } from '../../realtime';
import type { SyncResult } from './registry';

type OvhProject = string | { project_id?: string; projectId?: string; serviceName?: string };

type OvhInstance = {
  id?: string;
  name?: string;
  status?: string;
  region?: string;
  ipAddresses?: Array<{ ip?: string }> | string[];
  flavor?: { vcpus?: number; ram?: number };
  vcpus?: number;
  ram?: number;
  image?: { name?: string; type?: string };
  osType?: string;
};

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function normalizeStatus(status?: string): 'active' | 'inactive' {
  const s = (status ?? '').toLowerCase();
  if (s === 'active' || s === 'running' || s === 'build') return 'active';
  return 'inactive';
}

function extractProjectId(row: OvhProject): string | null {
  if (typeof row === 'string') return row;
  return row.project_id ?? row.projectId ?? row.serviceName ?? null;
}

function extractIps(instance: OvhInstance): { publicIpv4: string | null; privateIpv4: string | null; publicIpv6: string | null } {
  const raw = instance.ipAddresses ?? [];
  const ips = raw
    .map((v) => (typeof v === 'string' ? v : v?.ip ?? ''))
    .map((v) => v.trim())
    .filter(Boolean);

  const publicV4 = ips.find((ip) => ip.includes('.') && !isPrivateIPv4(ip)) ?? null;
  const privateV4 = ips.find((ip) => ip.includes('.') && isPrivateIPv4(ip)) ?? null;
  const publicV6 = ips.find((ip) => ip.includes(':')) ?? null;
  return { publicIpv4: publicV4, privateIpv4: privateV4, publicIpv6: publicV6 };
}

async function fetchJson<T>(url: string, apiToken: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OVHcloud API error ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

async function fetchOvhInstances(baseUrl: string, apiToken: string): Promise<Array<{ projectId: string; instance: OvhInstance }>> {
  const projects = await fetchJson<OvhProject[]>(`${baseUrl}/cloud/project`, apiToken);
  const projectIds = projects.map(extractProjectId).filter((v): v is string => Boolean(v));
  const all: Array<{ projectId: string; instance: OvhInstance }> = [];

  for (const projectId of projectIds) {
    const instances = await fetchJson<OvhInstance[]>(
      `${baseUrl}/cloud/project/${encodeURIComponent(projectId)}/instance`,
      apiToken
    );
    for (const instance of instances ?? []) {
      all.push({ projectId, instance });
    }
  }

  return all;
}

function hashInstances(items: Array<{ projectId: string; instance: OvhInstance }>): string {
  const sorted = [...items].sort((a, b) => {
    const aId = `${a.projectId}:${a.instance.id ?? ''}`;
    const bId = `${b.projectId}:${b.instance.id ?? ''}`;
    return aId.localeCompare(bId);
  });
  const key = sorted
    .map((x) => `${x.projectId}:${x.instance.id ?? ''}:${x.instance.status ?? ''}`)
    .join('|');
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

async function syncOvhProviderByBaseUrl(
  providerId: number,
  apiToken: string,
  providerName: string,
  storedHash: string | null,
  baseUrl: string
): Promise<SyncResult> {
  const instances = await fetchOvhInstances(baseUrl, apiToken);
  const hash = hashInstances(instances);

  if (storedHash && hash === storedHash) {
    await db.query('UPDATE cloud_providers SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1', [providerId]);
    emitRealtime({
      resource: 'cloud-providers',
      action: 'updated',
      at: new Date().toISOString(),
      id: providerId,
      meta: { providerName, skipped: true },
    });
    return { count: instances.length, hash, skipped: true };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const groupId = await getOrCreateGroup(client, providerName);

    for (const { projectId, instance } of instances) {
      const instanceId = String(instance.id ?? `${projectId}:${instance.name ?? 'unknown'}`);
      const cloudInstanceId = `${projectId}:${instanceId}`;
      const { publicIpv4, privateIpv4, publicIpv6 } = extractIps(instance);
      const cpuCores = instance.flavor?.vcpus ?? instance.vcpus ?? null;
      const ramMb = instance.flavor?.ram ?? instance.ram ?? null;
      const ramGb = typeof ramMb === 'number' ? Math.max(1, Math.round(ramMb / 1024)) : null;
      const os = instance.image?.name ?? instance.osType ?? instance.image?.type ?? 'Linux';
      const name = instance.name ?? `ovh-${instanceId}`;
      const region = instance.region ?? null;
      const status = normalizeStatus(instance.status);
      const notes = `OVHcloud instance · Project ${projectId}`;

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
          [name, name, publicIpv4, privateIpv4, publicIpv6, os, cpuCores, ramGb, region, status, notes, groupId, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO servers (name,hostname,ip_address,private_ip,ipv6_address,os,cpu_cores,ram_gb,region,status,notes,cloud_provider_id,cloud_instance_id,group_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [name, name, publicIpv4, privateIpv4, publicIpv6, os, cpuCores, ramGb, region, status, notes, providerId, cloudInstanceId, groupId]
        );
      }
    }

    await client.query(
      'UPDATE cloud_providers SET last_sync_at=CURRENT_TIMESTAMP, server_count=$1, instance_hash=$2 WHERE id=$3',
      [instances.length, hash, providerId]
    );

    await client.query('COMMIT');
    emitRealtime({
      resource: 'servers',
      action: 'sync',
      at: new Date().toISOString(),
      meta: { providerId, providerName, syncedCount: instances.length },
    });
    emitRealtime({
      resource: 'cloud-providers',
      action: 'updated',
      at: new Date().toISOString(),
      id: providerId,
      meta: { providerName, syncedCount: instances.length },
    });
    return { count: instances.length, hash, skipped: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function syncOvhCaProvider(
  providerId: number,
  apiToken: string,
  providerName: string,
  storedHash: string | null = null
): Promise<SyncResult> {
  return syncOvhProviderByBaseUrl(providerId, apiToken, providerName, storedHash, 'https://ca.api.ovh.com/1.0');
}

export async function syncOvhUsProvider(
  providerId: number,
  apiToken: string,
  providerName: string,
  storedHash: string | null = null
): Promise<SyncResult> {
  return syncOvhProviderByBaseUrl(providerId, apiToken, providerName, storedHash, 'https://api.us.ovhcloud.com/1.0');
}
