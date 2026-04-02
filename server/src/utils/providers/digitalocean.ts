import { createHash } from 'crypto';
import db from '../../db';
import { emitRealtime } from '../../realtime';
import type { SyncResult } from './registry';

interface DoNetwork {
  ip_address: string;
  type: 'public' | 'private';
  netmask?: string;
  gateway?: string;
}

interface DoNetworkV6 {
  ip_address: string;
  type: 'public';
  cidr?: number;
  gateway?: string;
}

interface DoDroplet {
  id: number;
  name: string;
  status: 'new' | 'active' | 'off' | 'archive';
  networks: {
    v4: DoNetwork[];
    v6: DoNetworkV6[];
  };
  size: {
    vcpus: number;
    memory: number; // MB
  };
  region: {
    slug: string;
    name: string;
  };
  image: {
    distribution: string;
    name: string;
    slug?: string | null;
  };
}

async function fetchDoDroplets(apiToken: string): Promise<DoDroplet[]> {
  const all: DoDroplet[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(`https://api.digitalocean.com/v2/droplets?page=${page}&per_page=${perPage}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`DigitalOcean API error ${res.status}: ${body}`);
    }

    const data = await res.json() as {
      droplets: DoDroplet[];
      meta?: { total?: number };
      links?: { pages?: { next?: string } };
    };

    all.push(...(data.droplets ?? []));

    const total = data.meta?.total ?? 0;
    if (all.length >= total || !data.links?.pages?.next || (data.droplets?.length ?? 0) === 0) {
      break;
    }
    page++;
  }

  return all;
}

function formatDoOs(image: DoDroplet['image']): string {
  const dist = image.distribution?.trim();
  const name = image.name?.trim();
  if (dist && name) return `${dist} ${name}`;
  if (dist) return dist;
  if (name) return name;
  return 'Linux';
}

function hashDroplets(droplets: DoDroplet[]): string {
  const sorted = [...droplets].sort((a, b) => a.id - b.id);
  const key = sorted.map((d) => `${d.id}:${d.status}`).join('|');
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

export async function syncDigitalOceanProvider(
  providerId: number,
  apiToken: string,
  providerName: string,
  storedHash: string | null = null
): Promise<SyncResult> {
  const droplets = await fetchDoDroplets(apiToken);
  const hash = hashDroplets(droplets);

  if (storedHash && hash === storedHash) {
    await db.query('UPDATE cloud_providers SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1', [providerId]);
    emitRealtime({ resource: 'cloud-providers', action: 'updated', at: new Date().toISOString(), id: providerId, meta: { providerName, skipped: true } });
    return { count: droplets.length, hash, skipped: true };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const groupId = await getOrCreateGroup(client, providerName);

    for (const droplet of droplets) {
      const cloudInstanceId = String(droplet.id);
      const os = formatDoOs(droplet.image);
      const cpuCores = droplet.size.vcpus;
      const ramGb = Math.round(droplet.size.memory / 1024);
      const region = droplet.region.slug;
      const status = droplet.status === 'active' ? 'active' : 'inactive';
      const notes = `DigitalOcean Droplet`;

      // Partition IPs
      const pubV4 = droplet.networks.v4.filter((n) => n.type === 'public');
      const privV4 = droplet.networks.v4.filter((n) => n.type === 'private');
      const publicIpv4 = pubV4[0]?.ip_address ?? null;
      const privateIpv4 = privV4[0]?.ip_address ?? null;
      const publicIpv6 = droplet.networks.v6[0]?.ip_address ?? null;

      // Store extra public IPs in the same JSON extras format
      const extraPubV4 = pubV4.slice(1).map((n) => n.ip_address);
      const extraPrivV4 = privV4.slice(1).map((n) => n.ip_address);
      const extraV6 = droplet.networks.v6.slice(1).map((n) => n.ip_address);
      const hasExtras = extraPubV4.length || extraPrivV4.length || extraV6.length;
      const networkExtrasJson = hasExtras
        ? JSON.stringify({
            additional_public_ipv4: extraPubV4,
            additional_public_ipv6: extraV6,
            vpc_ipv4: extraPrivV4,
            vpc_ipv6: [],
            nat_1_1_ipv4: [],
            vpc_subnet_lines: [],
          })
        : null;

      const existing = await client.query(
        'SELECT id FROM servers WHERE cloud_provider_id = $1 AND cloud_instance_id = $2',
        [providerId, cloudInstanceId]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE servers SET
            name=$1, hostname=$2,
            ip_address=$3, private_ip=$4, ipv6_address=$5,
            linode_network_extras=$6,
            os=$7, cpu_cores=$8, ram_gb=$9, region=$10, status=$11, notes=$12,
            group_id=COALESCE(group_id, $13),
            updated_at=CURRENT_TIMESTAMP
          WHERE id=$14`,
          [droplet.name, droplet.name, publicIpv4, privateIpv4, publicIpv6,
           networkExtrasJson, os, cpuCores, ramGb, region, status, notes,
           groupId, existing.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO servers (name,hostname,ip_address,private_ip,ipv6_address,linode_network_extras,os,cpu_cores,ram_gb,region,status,notes,cloud_provider_id,cloud_instance_id,group_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [droplet.name, droplet.name, publicIpv4, privateIpv4, publicIpv6,
           networkExtrasJson, os, cpuCores, ramGb, region, status, notes,
           providerId, cloudInstanceId, groupId]
        );
      }
    }

    await client.query(
      'UPDATE cloud_providers SET last_sync_at=CURRENT_TIMESTAMP, server_count=$1, instance_hash=$2 WHERE id=$3',
      [droplets.length, hash, providerId]
    );

    await client.query('COMMIT');
    emitRealtime({ resource: 'servers', action: 'sync', at: new Date().toISOString(), meta: { providerId, providerName, syncedCount: droplets.length } });
    emitRealtime({ resource: 'cloud-providers', action: 'updated', at: new Date().toISOString(), id: providerId, meta: { providerName, syncedCount: droplets.length } });
    return { count: droplets.length, hash, skipped: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
