import db from '../db';

interface LinodeInstance {
  id: number;
  label: string;
  ipv4: string[];
  region: string;
  type: string;
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
 * Sync servers from a Linode cloud provider
 * Upserts servers by cloud_instance_id, updates provider stats
 * Returns count of synced servers
 */
export async function syncLinodeProvider(
  providerId: number,
  apiToken: string
): Promise<number> {
  const instances = await fetchLinodeInstances(apiToken);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    for (const instance of instances) {
      const cloudInstanceId = String(instance.id);
      const name = instance.label;
      const hostname = instance.label;
      const ipAddress = instance.ipv4[0] || null;
      const os = 'Linux'; // Linode doesn't expose OS in basic instance data
      const cpuCores = instance.specs.vcpus;
      const ramGb = Math.round(instance.specs.memory / 1024);
      const status = instance.status === 'running' ? 'active' : 'inactive';
      const notes = `Region: ${instance.region}, Type: ${instance.type}`;

      // Check if server exists by cloud_instance_id and provider
      const existing = await client.query(
        'SELECT id FROM servers WHERE cloud_provider_id = $1 AND cloud_instance_id = $2',
        [providerId, cloudInstanceId]
      );

      if (existing.rows.length > 0) {
        // Update existing server
        await client.query(
          `UPDATE servers SET
            name = $1, hostname = $2, ip_address = $3, os = $4,
            cpu_cores = $5, ram_gb = $6, status = $7, notes = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9`,
          [name, hostname, ipAddress, os, cpuCores, ramGb, status, notes, existing.rows[0].id]
        );
      } else {
        // Insert new server
        await client.query(
          `INSERT INTO servers (
            name, hostname, ip_address, os, cpu_cores, ram_gb, status, notes,
            cloud_provider_id, cloud_instance_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [name, hostname, ipAddress, os, cpuCores, ramGb, status, notes, providerId, cloudInstanceId]
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
 * Run auto-sync for all providers with auto_sync enabled
 * Called by cron job and can be used for manual sync
 */
export async function runAutoSync(): Promise<void> {
  console.log('[CloudSync] Starting auto-sync...');

  try {
    const result = await db.query(
      'SELECT id, name, provider, api_token FROM cloud_providers WHERE auto_sync = TRUE'
    );

    const providers = result.rows as {
      id: number;
      name: string;
      provider: string;
      api_token: string;
    }[];

    if (providers.length === 0) {
      console.log('[CloudSync] No providers with auto_sync enabled');
      return;
    }

    for (const provider of providers) {
      try {
        console.log(`[CloudSync] Syncing provider: ${provider.name} (${provider.provider})`);

        let syncedCount = 0;
        if (provider.provider === 'linode') {
          syncedCount = await syncLinodeProvider(provider.id, provider.api_token);
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
