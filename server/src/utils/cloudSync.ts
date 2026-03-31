import db from '../db';
import { emitRealtime } from '../realtime';

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

type LinodeNetworkExtras = {
  /** Extra public IPv4: additional addresses in public subnet (public[1..], shared, reserved). */
  additional_public_ipv4: string[];
  /** Extra routed public IPv6 global ranges/addresses beyond the primary. */
  additional_public_ipv6: string[];
  vpc_ipv4: string[];
  vpc_ipv6: string[];
  /** Linode NAT 1:1 (public side) for VPC addresses */
  nat_1_1_ipv4: string[];
  /** Human-readable subnet lines from Linode VPC objects (gateway, mask, ids, ranges). */
  vpc_subnet_lines: string[];
};

export type LinodeResolvedIps = {
  publicIpv4: string | null;
  privateIpv4: string | null;
  publicIpv6: string | null;
  privateIpv6: string | null;
  extras: LinodeNetworkExtras;
};

function extractNat11(n: unknown): string | null {
  if (n == null || n === '') return null;
  if (typeof n === 'string') {
    const t = n.trim();
    return t || null;
  }
  if (typeof n === 'object' && n !== null && 'address' in n) {
    const a = (n as { address?: string }).address?.trim();
    return a || null;
  }
  return null;
}

/** Linode VPC entry: private side is `address` and/or `address_range`; public NAT may be `nat_1_1` string. */
function vpcPrivateIpv4(v: { address?: string | null; address_range?: string | null }): string | null {
  const a = typeof v.address === 'string' ? v.address.trim() : '';
  if (a) return a;
  const r = typeof v.address_range === 'string' ? v.address_range.trim() : '';
  return r || null;
}

/** Linode VPC IP object — subnet mask, gateway, ids, range (from GET …/instances/{id}/ips). */
function summarizeLinodeVpcSubnet(v: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (typeof v.vpc_id === 'number') parts.push(`VPC ${v.vpc_id}`);
  if (typeof v.subnet_id === 'number') parts.push(`subnet ${v.subnet_id}`);
  const ar = typeof v.address_range === 'string' ? v.address_range.trim() : '';
  const range = typeof v.range === 'string' ? v.range.trim() : '';
  const ipv6Range = typeof v.ipv6_range === 'string' ? v.ipv6_range.trim() : '';
  if (ar) parts.push(ar);
  else if (range) parts.push(range);
  else if (ipv6Range) parts.push(ipv6Range);
  const mask = typeof v.subnet_mask === 'string' ? v.subnet_mask.trim() : '';
  if (mask && !parts.some((p) => p.includes(mask))) parts.push(mask);
  if (typeof v.prefix === 'number' && v.prefix > 0 && !ar && !range && !ipv6Range) {
    parts.push(`/${v.prefix}`);
  }
  const gw = typeof v.gateway === 'string' ? v.gateway.trim() : '';
  if (gw) parts.push(`gw ${gw}`);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

/** Public / shared / reserved instance IPs expose NAT as `vpc_nat_1_1.address` (not only `ipv4.vpc[].nat_1_1`). */
function collectVpcNat1To1FromInstanceIps(
  list: Array<{ vpc_nat_1_1?: { address?: string } | null }> | undefined,
  out: string[]
): void {
  if (!Array.isArray(list)) return;
  for (const p of list) {
    const a = p?.vpc_nat_1_1?.address?.trim();
    if (a) out.push(a);
  }
}

function uniqStrings(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function emptyExtras(): LinodeNetworkExtras {
  return {
    additional_public_ipv4: [],
    additional_public_ipv6: [],
    vpc_ipv4: [],
    vpc_ipv6: [],
    nat_1_1_ipv4: [],
    vpc_subnet_lines: [],
  };
}

function serializeNetworkExtras(extras: LinodeNetworkExtras): string | null {
  const has =
    extras.additional_public_ipv4.length > 0 ||
    extras.additional_public_ipv6.length > 0 ||
    extras.vpc_ipv4.length > 0 ||
    extras.vpc_ipv6.length > 0 ||
    extras.nat_1_1_ipv4.length > 0 ||
    extras.vpc_subnet_lines.length > 0;
  if (!has) return null;
  return JSON.stringify(extras);
}

/** Extra public IPv4s (shared pool, reserved, 2nd+ public) — excludes primary. */
function collectAdditionalPublicIpv4(
  primary: string | null,
  publicList: Array<{ address?: string }> | undefined,
  shared: Array<{ address?: string }> | undefined,
  reserved: Array<{ address?: string }> | undefined,
  out: string[]
): void {
  const primaryKey = primary?.trim().toLowerCase() ?? '';
  const push = (addr: string | undefined) => {
    const t = addr?.trim();
    if (!t || t.toLowerCase() === primaryKey) return;
    out.push(t);
  };
  if (Array.isArray(publicList)) {
    for (let i = 1; i < publicList.length; i++) {
      push(publicList[i]?.address);
    }
  }
  if (Array.isArray(shared)) {
    for (const p of shared) push(p?.address);
  }
  if (Array.isArray(reserved)) {
    for (const p of reserved) push(p?.address);
  }
}

function collectAdditionalPublicIpv6(
  primary: string | null,
  globalList: Array<{ range?: string; address?: string }> | undefined,
  out: string[]
): void {
  const primaryKey = primary?.trim().toLowerCase() ?? '';
  if (!Array.isArray(globalList)) return;
  for (const g of globalList) {
    const a = g?.address?.trim() || g?.range?.trim();
    if (!a || a.toLowerCase() === primaryKey) continue;
    out.push(a);
  }
}

/**
 * Prefer Linode /linode/instances/{id}/ips; fall back to instance list ipv4/ipv6 heuristics.
 * VPC + NAT 1:1 from ipv4.vpc[]; omits link-local from private_ipv6 (not useful for inventory).
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
    const extras = emptyExtras();
    const pubAll = listIpv4.filter((ip) => !isPrivateIPv4(ip.trim()));
    for (let i = 1; i < pubAll.length; i++) {
      const t = pubAll[i].trim();
      if (t && t.toLowerCase() !== (publicIpv4 ?? '').toLowerCase()) {
        extras.additional_public_ipv4.push(t);
      }
    }
    extras.additional_public_ipv4 = uniqStrings(extras.additional_public_ipv4);
    return {
      publicIpv4,
      privateIpv4,
      publicIpv6: v6,
      privateIpv6: null,
      extras,
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
      ipv4?: {
        public?: Array<{ address?: string; vpc_nat_1_1?: { address?: string } | null }>;
        private?: Array<{ address?: string }>;
        shared?: Array<{ address?: string; vpc_nat_1_1?: { address?: string } | null }>;
        reserved?: Array<{ address?: string; vpc_nat_1_1?: { address?: string } | null }>;
        vpc?: Array<Record<string, unknown> & {
          address?: string | null;
          address_range?: string | null;
          nat_1_1?: unknown;
        }>;
      };
      ipv6?: {
        slaac?: { address?: string; subnet?: string };
        global?: Array<{ range?: string; address?: string }>;
        link_local?: { address?: string } | string;
        vpc?: Array<
          Record<string, unknown> & {
            address?: string;
            range?: string;
            ipv6_addresses?: Array<{ slaac_address?: string }>;
          }
        >;
      };
    };

    let publicIpv4 = data.ipv4?.public?.[0]?.address?.trim() || null;
    let privateIpv4 = data.ipv4?.private?.[0]?.address?.trim() || null;

    let publicIpv6: string | null =
      data.ipv6?.slaac?.address?.trim() ||
      data.ipv6?.global?.[0]?.address?.trim() ||
      data.ipv6?.global?.[0]?.range?.trim() ||
      null;

    const extras = emptyExtras();
    const vpc4List = data.ipv4?.vpc;
    if (Array.isArray(vpc4List)) {
      for (const v of vpc4List) {
        const priv = vpcPrivateIpv4(v);
        if (priv) extras.vpc_ipv4.push(priv);
        const nat = extractNat11(v?.nat_1_1);
        if (nat) extras.nat_1_1_ipv4.push(nat);
        const sub = summarizeLinodeVpcSubnet(v as Record<string, unknown>);
        if (sub) extras.vpc_subnet_lines.push(sub);
      }
    }
    collectVpcNat1To1FromInstanceIps(data.ipv4?.public, extras.nat_1_1_ipv4);
    collectVpcNat1To1FromInstanceIps(data.ipv4?.shared, extras.nat_1_1_ipv4);
    collectVpcNat1To1FromInstanceIps(data.ipv4?.reserved, extras.nat_1_1_ipv4);
    extras.vpc_ipv4 = uniqStrings(extras.vpc_ipv4);
    extras.nat_1_1_ipv4 = uniqStrings(extras.nat_1_1_ipv4);

    const vpc6List = data.ipv6?.vpc;
    if (Array.isArray(vpc6List)) {
      for (const v of vpc6List) {
        const a = v?.address?.trim() || v?.range?.trim();
        if (a) extras.vpc_ipv6.push(a);
        const v6addrs = v?.ipv6_addresses;
        if (Array.isArray(v6addrs)) {
          for (const e of v6addrs) {
            const s = e?.slaac_address?.trim();
            if (s) extras.vpc_ipv6.push(s);
          }
        }
        const sub = summarizeLinodeVpcSubnet(v as Record<string, unknown>);
        if (sub) extras.vpc_subnet_lines.push(sub);
      }
    }
    extras.vpc_ipv6 = uniqStrings(extras.vpc_ipv6);
    extras.vpc_subnet_lines = uniqStrings(extras.vpc_subnet_lines);

    collectAdditionalPublicIpv4(
      publicIpv4,
      data.ipv4?.public,
      data.ipv4?.shared,
      data.ipv4?.reserved,
      extras.additional_public_ipv4
    );
    extras.additional_public_ipv4 = uniqStrings(extras.additional_public_ipv4);

    collectAdditionalPublicIpv6(publicIpv6, data.ipv6?.global, extras.additional_public_ipv6);
    extras.additional_public_ipv6 = uniqStrings(extras.additional_public_ipv6);

    /** No link-local in inventory private_ipv6 */
    const privateIpv6: string | null = null;

    const fb = fallback();
    if (!publicIpv4 && !privateIpv4) {
      publicIpv4 = fb.publicIpv4;
      privateIpv4 = fb.privateIpv4;
    }
    if (!publicIpv6) publicIpv6 = fb.publicIpv6;

    return { publicIpv4, privateIpv4, publicIpv6, privateIpv6, extras };
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
      const { publicIpv4, privateIpv4, publicIpv6, privateIpv6, extras } = ips;
      const networkExtrasJson = serializeNetworkExtras(extras);

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
            linode_network_extras = $7,
            os = $8,
            cpu_cores = $9, ram_gb = $10, region = $11, status = $12, notes = $13,
            group_id = COALESCE(group_id, $14),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $15`,
          [
            name,
            hostname,
            publicIpv4,
            privateIpv4,
            publicIpv6,
            privateIpv6,
            networkExtrasJson,
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
            name, hostname, ip_address, private_ip, ipv6_address, private_ipv6, linode_network_extras, os, cpu_cores, ram_gb, region, status, notes,
            cloud_provider_id, cloud_instance_id, group_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            name,
            hostname,
            publicIpv4,
            privateIpv4,
            publicIpv6,
            privateIpv6,
            networkExtrasJson,
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
