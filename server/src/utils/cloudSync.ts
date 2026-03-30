import db from '../db';

/**
 * Format Linode image string to human-readable OS name
 * e.g., "linode/ubuntu22.04" -> "Ubuntu 22.04"
 * e.g., "linode/debian11" -> "Debian 11"
 */
function formatLinodeImage(image: string | null): string {
  if (!image) return 'Linux';

  // Remove "linode/" prefix for standard images
  const name = image.replace(/^linode\//, '');

  // Common OS mappings
  const osMap: Record<string, string> = {
    ubuntu: 'Ubuntu',
    debian: 'Debian',
    centos: 'CentOS',
    almalinux: 'AlmaLinux',
    rockylinux: 'Rocky Linux',
    fedora: 'Fedora',
    arch: 'Arch Linux',
    gentoo: 'Gentoo',
    opensuse: 'openSUSE',
    slackware: 'Slackware',
    alpine: 'Alpine',
    kali: 'Kali Linux',
  };

  // Try to match and format
  for (const [key, label] of Object.entries(osMap)) {
    const regex = new RegExp(`^${key}(\\d+\\.?\\d*)`, 'i');
    const match = name.match(regex);
    if (match) {
      const version = match[1] ? ` ${match[1].replace(/(\d+)(\d{2})$/, '$1.$2')}` : '';
      return `${label}${version}`;
    }
  }

  // Fallback: capitalize first letter (only if it starts with a letter)
  if (/^[a-zA-Z]/.test(name)) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  return 'Linux';
}

/**
 * Fetch image details from Linode API
 */
async function fetchLinodeImageLabel(apiToken: string, imageId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.linode.com/v4/images/${imageId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json() as { label?: string; description?: string };
    return data.label || data.description || null;
  } catch {
    return null;
  }
}

/**
 * Check if image is a private/custom image (numeric ID or private/ prefix)
 */
function isPrivateImage(image: string | null): boolean {
  if (!image) return false;
  return image.startsWith('private/') || /^[\d]+$/.test(image);
}

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

function partitionPublicPrivateIpv4(ipv4: string[]): { publicIpv4: string | null; privateIpv4: string | null } {
  const pub: string[] = [];
  const priv: string[] = [];
  for (const ip of ipv4) {
    if (isPrivateIPv4(ip)) priv.push(ip);
    else pub.push(ip);
  }
  return { publicIpv4: pub[0] ?? null, privateIpv4: priv[0] ?? null };
}

export type LinodeResolvedIps = {
  publicIpv4: string | null;
  privateIpv4: string | null;
  publicIpv6: string | null;
  privateIpv6: string | null;
};

/**
 * Prefer Linode /linode/instances/{id}/ips; fall back to instance list ipv4/ipv6 heuristics.
 */
async function resolveLinodeIps(
  apiToken: string,
  linodeId: number,
  listIpv4: string[],
  listIpv6: string | null | undefined
): Promise<LinodeResolvedIps> {
  const fallback = (): LinodeResolvedIps => {
    const { publicIpv4, privateIpv4 } = partitionPublicPrivateIpv4(listIpv4);
    const v6 = listIpv6?.trim() || null;
    return {
      publicIpv4,
      privateIpv4,
      publicIpv6: v6,
      privateIpv6: null,
    };
  };

  try {
    const res = await fetch(`https://api.linode.com/v4/linode/instances/${linodeId}/ips`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return fallback();

    const data = (await res.json()) as {
      ipv4?: { public?: Array<{ address?: string }>; private?: Array<{ address?: string }> };
      ipv6?: {
        slaac?: { address?: string; subnet?: string };
        global?: Array<{ range?: string; address?: string }>;
        link_local?: { address?: string } | string;
      };
    };

    let publicIpv4 = data.ipv4?.public?.[0]?.address?.trim() || null;
    let privateIpv4 = data.ipv4?.private?.[0]?.address?.trim() || null;

    let publicIpv6: string | null =
      data.ipv6?.slaac?.address?.trim() ||
      data.ipv6?.global?.[0]?.address?.trim() ||
      data.ipv6?.global?.[0]?.range?.trim() ||
      null;

    let privateIpv6: string | null = null;
    const ll = data.ipv6?.link_local;
    if (typeof ll === 'string') privateIpv6 = ll.trim() || null;
    else if (ll && typeof ll === 'object' && ll.address) privateIpv6 = ll.address.trim() || null;

    const fb = fallback();
    if (!publicIpv4 && !privateIpv4) {
      publicIpv4 = fb.publicIpv4;
      privateIpv4 = fb.privateIpv4;
    }
    if (!publicIpv6) publicIpv6 = fb.publicIpv6;
    if (!privateIpv6) privateIpv6 = fb.privateIpv6;

    return { publicIpv4, privateIpv4, publicIpv6, privateIpv6 };
  } catch {
    return fallback();
  }
}

interface LinodeInstance {
  id: number;
  label: string;
  ipv4: string[];
  ipv6?: string | null;
  region: string;
  type: string;
  image: string | null;
  status: string;
  specs: {
    vcpus: number;
    memory: number;
    disk: number;
  };
}

interface LinodeResponse {
  data: LinodeInstance[];
  page: number;
  pages: number;
  results: number;
}

/**
 * Fetch all Linode instances using pagination
 */
async function fetchLinodeInstances(apiToken: string): Promise<LinodeInstance[]> {
  const allInstances: LinodeInstance[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await fetch(
      `https://api.linode.com/v4/linode/instances?page=${page}&page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Linode API error: ${response.status} - ${errorText}`);
    }

    const data: LinodeResponse = await response.json();
    allInstances.push(...data.data);
    totalPages = data.pages;
    page++;
  }

  return allInstances;
}

/**
 * Find or create a group for cloud provider servers
 */
async function getOrCreateProviderGroup(
  client: any,
  providerName: string
): Promise<number> {
  // Check if group exists
  const existing = await client.query(
    'SELECT id FROM groups WHERE name = $1',
    [providerName]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new group
  const result = await client.query(
    'INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id',
    [providerName, `Auto-created group for ${providerName} cloud servers`]
  );

  return result.rows[0].id;
}

/**
 * Sync servers from a Linode cloud provider
 * Upserts servers by cloud_instance_id, updates provider stats
 * Returns count of synced servers
 */
export async function syncLinodeProvider(
  providerId: number,
  apiToken: string,
  providerName: string
): Promise<number> {
  const instances = await fetchLinodeInstances(apiToken);

  // Resolve OS + networking (Linode /ips per instance) before DB transaction
  const rows: { instance: LinodeInstance; os: string; ips: LinodeResolvedIps }[] = [];
  for (const instance of instances) {
    let os = 'Linux';
    if (instance.image) {
      if (isPrivateImage(instance.image)) {
        const imageLabel = await fetchLinodeImageLabel(apiToken, instance.image);
        os = imageLabel || 'Custom Image';
      } else {
        os = formatLinodeImage(instance.image);
      }
    }
    const ips = await resolveLinodeIps(apiToken, instance.id, instance.ipv4 || [], instance.ipv6 ?? null);
    rows.push({ instance, os, ips });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get or create group for this provider
    const groupId = await getOrCreateProviderGroup(client, providerName);

    for (const { instance, os, ips } of rows) {
      const cloudInstanceId = String(instance.id);
      const name = instance.label;
      const hostname = instance.label;
      const { publicIpv4, privateIpv4, publicIpv6, privateIpv6 } = ips;

      const cpuCores = instance.specs.vcpus;
      const ramGb = Math.round(instance.specs.memory / 1024);
      const region = instance.region;
      const status = instance.status === 'running' ? 'active' : 'inactive';
      const notes = `Type: ${instance.type}`;

      // Check if server exists by cloud_instance_id and provider
      const existing = await client.query(
        'SELECT id FROM servers WHERE cloud_provider_id = $1 AND cloud_instance_id = $2',
        [providerId, cloudInstanceId]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE servers SET
            name = $1, hostname = $2,
            ip_address = $3, private_ip = $4, ipv6_address = $5, private_ipv6 = $6,
            os = $7,
            cpu_cores = $8, ram_gb = $9, region = $10, status = $11, notes = $12,
            group_id = COALESCE(group_id, $13),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $14`,
          [
            name,
            hostname,
            publicIpv4,
            privateIpv4,
            publicIpv6,
            privateIpv6,
            os,
            cpuCores,
            ramGb,
            region,
            status,
            notes,
            groupId,
            existing.rows[0].id,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO servers (
            name, hostname, ip_address, private_ip, ipv6_address, private_ipv6, os, cpu_cores, ram_gb, region, status, notes,
            cloud_provider_id, cloud_instance_id, group_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            name,
            hostname,
            publicIpv4,
            privateIpv4,
            publicIpv6,
            privateIpv6,
            os,
            cpuCores,
            ramGb,
            region,
            status,
            notes,
            providerId,
            cloudInstanceId,
            groupId,
          ]
        );
      }
    }

    // Update provider stats
    await client.query(
      `UPDATE cloud_providers SET
        last_sync_at = CURRENT_TIMESTAMP,
        server_count = $1
      WHERE id = $2`,
      [instances.length, providerId]
    );

    await client.query('COMMIT');
    return instances.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run auto-sync for providers scheduled at the current hour
 * Called by cron job every hour
 */
export async function runAutoSync(): Promise<void> {
  const currentHour = new Date().getHours();
  console.log(`[CloudSync] Checking for providers scheduled at hour ${currentHour}...`);

  try {
    const result = await db.query(
      'SELECT id, name, provider, api_token FROM cloud_providers WHERE auto_sync = TRUE AND sync_hour = $1',
      [currentHour]
    );

    const providers = result.rows as {
      id: number;
      name: string;
      provider: string;
      api_token: string;
    }[];

    if (providers.length === 0) {
      console.log(`[CloudSync] No providers scheduled for hour ${currentHour}`);
      return;
    }

    console.log(`[CloudSync] Found ${providers.length} provider(s) to sync`);

    for (const provider of providers) {
      try {
        console.log(`[CloudSync] Syncing provider: ${provider.name} (${provider.provider})`);

        let syncedCount = 0;
        if (provider.provider === 'linode') {
          syncedCount = await syncLinodeProvider(provider.id, provider.api_token, provider.name);
        } else {
          console.log(`[CloudSync] Unsupported provider type: ${provider.provider}`);
          continue;
        }

        console.log(`[CloudSync] Synced ${syncedCount} servers from ${provider.name}`);
      } catch (err: any) {
        console.error(`[CloudSync] Failed to sync provider ${provider.name}:`, err.message);
      }
    }

    console.log('[CloudSync] Auto-sync completed');
  } catch (err: any) {
    console.error('[CloudSync] Auto-sync failed:', err.message);
  }
}
