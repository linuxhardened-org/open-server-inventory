import { createHash } from 'crypto';
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstanceTypesCommand,
  DescribeRegionsCommand,
  type Instance,
} from '@aws-sdk/client-ec2';
import db from '../../db';
import { emitRealtime } from '../../realtime';
import type { SyncResult } from './registry';

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

function parseAwsToken(apiToken: string): AwsCredentials {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(apiToken);
  } catch {
    throw new Error('AWS credentials must be a JSON object with accessKeyId and secretAccessKey');
  }
  if (!parsed.accessKeyId || !parsed.secretAccessKey) {
    throw new Error('AWS credentials must contain accessKeyId and secretAccessKey');
  }
  return parsed as unknown as AwsCredentials;
}

function makeClient(creds: AwsCredentials, region: string): EC2Client {
  return new EC2Client({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

/** Fetch all enabled regions for this account. */
async function fetchAllRegions(creds: AwsCredentials): Promise<string[]> {
  // us-east-1 is always available and can call DescribeRegions globally
  const ec2 = makeClient(creds, 'us-east-1');
  const resp = await ec2.send(new DescribeRegionsCommand({ AllRegions: false }));
  return (resp.Regions ?? []).map((r) => r.RegionName!).filter(Boolean);
}

/** Fetch all non-terminated EC2 instances in a single region, across all pages. */
async function fetchInstancesInRegion(ec2: EC2Client): Promise<Instance[]> {
  const all: Instance[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await ec2.send(new DescribeInstancesCommand({
      Filters: [
        { Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped', 'shutting-down'] },
      ],
      NextToken: nextToken,
      MaxResults: 1000,
    }));
    for (const reservation of resp.Reservations ?? []) {
      all.push(...(reservation.Instances ?? []));
    }
    nextToken = resp.NextToken;
  } while (nextToken);

  return all;
}

/** Fetch CPU/RAM specs for a batch of instance types (max 100 per call). */
async function fetchInstanceTypeSpecs(
  ec2: EC2Client,
  instanceTypes: string[]
): Promise<Map<string, { vcpus: number; memoryGb: number }>> {
  const specs = new Map<string, { vcpus: number; memoryGb: number }>();
  if (instanceTypes.length === 0) return specs;

  for (let i = 0; i < instanceTypes.length; i += 100) {
    const batch = instanceTypes.slice(i, i + 100);
    const resp = await ec2.send(new DescribeInstanceTypesCommand({
      InstanceTypes: batch as any,
    }));
    for (const info of resp.InstanceTypes ?? []) {
      const vcpus = info.VCpuInfo?.DefaultVCpus ?? 0;
      const memoryGb = Math.round((info.MemoryInfo?.SizeInMiB ?? 0) / 1024);
      specs.set(info.InstanceType ?? '', { vcpus, memoryGb });
    }
  }
  return specs;
}

/** Return the value of the Name tag, falling back to the instance ID. */
function getInstanceName(instance: Instance): string {
  const tag = instance.Tags?.find((t) => t.Key === 'Name');
  return tag?.Value?.trim() || (instance.InstanceId ?? 'unknown');
}

/** Determine OS from PlatformDetails or Platform field. */
function getInstanceOs(instance: Instance): string {
  const platformDetails = instance.PlatformDetails?.toLowerCase() ?? '';
  const platform = instance.Platform?.toLowerCase() ?? '';

  if (platform === 'windows' || platformDetails.includes('windows')) return 'Windows';
  if (platformDetails.includes('red hat')) return 'Red Hat Enterprise Linux';
  if (platformDetails.includes('suse')) return 'SUSE Linux';
  if (platformDetails.includes('ubuntu')) return 'Ubuntu';
  if (platformDetails.includes('debian')) return 'Debian';
  if (platformDetails.includes('amazon linux')) return 'Amazon Linux';
  if (platformDetails.includes('centos')) return 'CentOS';
  if (platformDetails.includes('fedora')) return 'Fedora';
  return 'Linux';
}

/** Stable hash of (instanceId:state) across all regions for delta detection. */
function hashInstances(instances: Instance[]): string {
  const sorted = [...instances].sort((a, b) =>
    (a.InstanceId ?? '').localeCompare(b.InstanceId ?? '')
  );
  const key = sorted.map((i) => `${i.InstanceId}:${i.State?.Name}`).join('|');
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
 * Sync EC2 instances from ALL enabled AWS regions into the server inventory.
 * Credentials are stored as JSON: { accessKeyId, secretAccessKey }.
 * Regions are discovered dynamically via DescribeRegions — no region config needed.
 * Uses delta hash to skip DB writes when nothing has changed.
 */
export async function syncAwsProvider(
  providerId: number,
  apiToken: string,
  providerName: string,
  storedHash: string | null = null
): Promise<SyncResult> {
  const creds = parseAwsToken(apiToken);

  // Discover all enabled regions for this account
  const regions = await fetchAllRegions(creds);
  console.log(`[AWS] ${providerName}: syncing ${regions.length} regions: ${regions.join(', ')}`);

  // Fetch instances from all regions in parallel
  const regionalResults = await Promise.allSettled(
    regions.map(async (region) => {
      const ec2 = makeClient(creds, region);
      const instances = await fetchInstancesInRegion(ec2);
      return { region, instances, ec2 };
    })
  );

  // Collect all instances; log and skip failed regions (access may be restricted)
  const allInstances: Instance[] = [];
  const regionClients = new Map<string, EC2Client>();

  for (const result of regionalResults) {
    if (result.status === 'fulfilled') {
      allInstances.push(...result.value.instances);
      regionClients.set(result.value.region, result.value.ec2);
    } else {
      const err = result.reason as Error;
      console.warn(`[AWS] ${providerName}: skipped a region — ${err?.message}`);
    }
  }

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

  // Fetch instance type specs per-region (instance types are region-scoped)
  const specsByRegion = new Map<string, Map<string, { vcpus: number; memoryGb: number }>>();
  await Promise.all(
    [...regionClients.entries()].map(async ([region, ec2]) => {
      const instancesInRegion = allInstances.filter(
        (i) => i.Placement?.AvailabilityZone?.startsWith(region)
      );
      const uniqueTypes = [
        ...new Set(instancesInRegion.map((i) => i.InstanceType).filter(Boolean) as string[]),
      ];
      const specs = await fetchInstanceTypeSpecs(ec2, uniqueTypes);
      specsByRegion.set(region, specs);
    })
  );

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const groupId = await getOrCreateGroup(client, providerName);

    for (const instance of allInstances) {
      const cloudInstanceId = instance.InstanceId!;
      const name = getInstanceName(instance);
      const hostname =
        instance.PrivateDnsName?.trim() ||
        instance.PublicDnsName?.trim() ||
        name;
      const publicIpv4 = instance.PublicIpAddress ?? null;
      const privateIpv4 = instance.PrivateIpAddress ?? null;

      let publicIpv6: string | null = null;
      for (const iface of instance.NetworkInterfaces ?? []) {
        const v6 = iface.Ipv6Addresses?.[0]?.Ipv6Address;
        if (v6) { publicIpv6 = v6; break; }
      }

      const os = getInstanceOs(instance);
      const az = instance.Placement?.AvailabilityZone ?? '';
      // Derive region from AZ (e.g. "us-east-1a" → "us-east-1")
      const instanceRegion = az.replace(/[a-z]$/, '') || az;
      const regionSpecs = specsByRegion.get(instanceRegion) ?? new Map();
      const specs = regionSpecs.get(instance.InstanceType ?? '') ?? { vcpus: 0, memoryGb: 0 };
      const status = instance.State?.Name === 'running' ? 'active' : 'inactive';
      const notes = `Type: ${instance.InstanceType ?? 'Unknown'}`;

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
            os, specs.vcpus, specs.memoryGb, az, status, notes,
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
            os, specs.vcpus, specs.memoryGb, az, status, notes,
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
