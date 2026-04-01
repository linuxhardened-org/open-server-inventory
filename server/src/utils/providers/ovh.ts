import { createHash } from 'crypto';
import db from '../../db';
import { emitRealtime } from '../../realtime';
import type { SyncResult } from './registry';

interface OvhCredentials {
  appKey: string;
  appSecret: string;
  consumerKey: string;
}

type OvhProject = string | { project_id?: string; projectId?: string; serviceName?: string };

type OvhIpAddress = {
  ip?: string;
  type?: 'public' | 'private';
  version?: 4 | 6;
};

type OvhInstance = {
  id?: string;
  name?: string;
  status?: string;
  region?: string;
  ipAddresses?: OvhIpAddress[] | string[];
  flavor?: { vcpus?: number; ram?: number };
  vcpus?: number;
  ram?: number;
  image?: { name?: string; type?: string };
  osType?: string;
};

/** Parse api_token field — must be JSON with appKey/appSecret/consumerKey */
export function parseOvhCredentials(apiToken: string): OvhCredentials {
  try {
    const parsed = JSON.parse(apiToken) as Record<string, unknown>;
    const { appKey, appSecret, consumerKey } = parsed;
    if (typeof appKey === 'string' && typeof appSecret === 'string' && typeof consumerKey === 'string' &&
        appKey && appSecret && consumerKey) {
      return { appKey, appSecret, consumerKey };
    }
  } catch {
    // fall through
  }
  throw new Error('OVH credentials must be JSON: {"appKey":"...","appSecret":"...","consumerKey":"..."}');
}

/** Fetch OVH server time — avoids auth failures from local clock drift */
async function getOvhTimestamp(baseUrl: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    let ts: number;
    try {
      const res = await fetch(`${baseUrl}/auth/time`, { signal: controller.signal });
      ts = await res.json() as number;
    } finally {
      clearTimeout(timeout);
    }
    return typeof ts === 'number' ? ts : Math.floor(Date.now() / 1000);
  } catch {
    return Math.floor(Date.now() / 1000); // fallback to local time
  }
}

/** OVHcloud v1 request signing — SHA1 of concatenated fields, NOT HMAC */
function ovhSignedHeaders(creds: OvhCredentials, method: string, url: string, timestamp: number, body = ''): Record<string, string> {
  const pre = `${creds.appSecret}+${creds.consumerKey}+${method}+${url}+${body}+${timestamp}`;
  const sig = '$1$' + createHash('sha1').update(pre).digest('hex');
  return {
    'X-Ovh-Application': creds.appKey,
    'X-Ovh-Consumer': creds.consumerKey,
    'X-Ovh-Timestamp': String(timestamp),
    'X-Ovh-Signature': sig,
    'Content-Type': 'application/json',
  };
}

/** OVH instance statuses that indicate the server is running/reachable */
const ACTIVE_STATUSES = new Set([
  'ACTIVE', 'BUILD', 'BUILDING', 'REBOOT', 'HARD_REBOOT',
  'REBUILD', 'MIGRATING', 'RESIZE', 'VERIFY_RESIZE', 'REVERT_RESIZE',
  'RESCUE', 'PASSWORD',
]);

function normalizeStatus(status?: string): 'active' | 'inactive' {
  return ACTIVE_STATUSES.has((status ?? '').toUpperCase()) ? 'active' : 'inactive';
}

function extractProjectId(row: OvhProject): string | null {
  if (typeof row === 'string') return row;
  return row.project_id ?? row.projectId ?? row.serviceName ?? null;
}

function extractIps(instance: OvhInstance): { publicIpv4: string | null; privateIpv4: string | null; publicIpv6: string | null } {
  const raw = instance.ipAddresses ?? [];

  // OVH structured format with type/version fields
  if (raw.length > 0 && typeof raw[0] === 'object') {
    const typed = raw as OvhIpAddress[];
    return {
      publicIpv4: typed.find((a) => a.type === 'public' && a.version === 4)?.ip ?? null,
      privateIpv4: typed.find((a) => a.type === 'private' && a.version === 4)?.ip ?? null,
      publicIpv6: typed.find((a) => a.version === 6)?.ip ?? null,
    };
  }

  // Fallback: plain string array — infer from RFC-1918 ranges
  const ips = (raw as string[]).map((v) => v.trim()).filter(Boolean);
  const isPrivate = (ip: string) => {
    const m = ip.match(/^(\d+)\.(\d+)/);
    if (!m) return false;
    const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  };
  return {
    publicIpv4: ips.find((ip) => ip.includes('.') && !isPrivate(ip)) ?? null,
    privateIpv4: ips.find((ip) => ip.includes('.') && isPrivate(ip)) ?? null,
    publicIpv6: ips.find((ip) => ip.includes(':')) ?? null,
  };
}

async function fetchJson<T>(baseUrl: string, path: string, creds: OvhCredentials, timestamp: number): Promise<T> {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: ovhSignedHeaders(creds, 'GET', url, timestamp),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OVHcloud API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function fetchOvhInstances(baseUrl: string, creds: OvhCredentials): Promise<Array<{ projectId: string; instance: OvhInstance }>> {
  // Fetch OVH server time once — each request needs its own fresh timestamp
  const baseTimestamp = await getOvhTimestamp(baseUrl);
  const projects = await fetchJson<OvhProject[]>(baseUrl, '/cloud/project', creds, baseTimestamp);
  const projectIds = projects.map(extractProjectId).filter((v): v is string => Boolean(v));
  const results = await Promise.all(
    projectIds.map(async (projectId) => {
      const instances = await fetchJson<OvhInstance[]>(
        baseUrl,
        `/cloud/project/${encodeURIComponent(projectId)}/instance`,
        creds,
        baseTimestamp
      );
      return (instances ?? []).map((instance) => ({ projectId, instance }));
    })
  );

  return results.flat();
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

async function getOrCreateGroup(client: import('pg').PoolClient, groupName: string): Promise<number> {
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
  const creds = parseOvhCredentials(apiToken);
  const instances = await fetchOvhInstances(baseUrl, creds);
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
