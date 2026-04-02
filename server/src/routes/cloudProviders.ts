import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { adminAuth } from '../middleware/adminAuth';
import { getSyncFn } from '../utils/cloudSync';
import { getSupportedProviders } from '../utils/providers/registry';

const router = Router();

const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.string().min(1, 'Provider type is required'),
  api_token: z.string().min(1, 'API token is required'),
  auto_sync: z.boolean().default(true),
  sync_hour: z.number().int().min(0).max(23).default(0),
  sync_interval_minutes: z.number().int().min(5).max(1440).default(60),
});

const updateProviderSchema = z.object({
  name: z.string().min(1).optional(),
  auto_sync: z.boolean().optional(),
  sync_hour: z.number().int().min(0).max(23).optional(),
  sync_interval_minutes: z.number().int().min(5).max(1440).optional(),
});

// POST /audit-token - Probe cloud token permissions and return security report
router.post('/audit-token', adminAuth, async (req, res) => {
  try {
    const parsed = z.object({
      provider: z.string().min(1),
      api_token: z.string().min(1),
    }).safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.issues[0].message);

    const { provider, api_token } = parsed.data;

    if (provider !== 'linode') {
      return sendError(res, `Permission audit not yet supported for provider: ${provider}`);
    }

    // Probe Linode API endpoints to detect granted scopes
    // 200/400/422 = permission granted; 401 = invalid token; 403 = no permission
    const probe = async (url: string, method = 'GET', body?: string) => {
      const opts: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${api_token}`,
          'Content-Type': 'application/json',
        },
      };
      if (body) opts.body = body;
      try {
        const r = await fetch(url, opts);
        return r.status;
      } catch {
        return 0; // network error
      }
    };

    const [
      linodeListStatus,
      linodeWriteStatus,
      accountStatus,
      domainsStatus,
      volumesStatus,
      nodebalancersStatus,
      databasesStatus,
      imagesStatus,
      firewallStatus,
      lkeStatus,
    ] = await Promise.all([
      probe('https://api.linode.com/v4/linode/instances?page_size=1'),
      probe('https://api.linode.com/v4/linode/instances', 'POST', '{}'),
      probe('https://api.linode.com/v4/account'),
      probe('https://api.linode.com/v4/domains'),
      probe('https://api.linode.com/v4/volumes'),
      probe('https://api.linode.com/v4/nodebalancers'),
      probe('https://api.linode.com/v4/databases/instances'),
      probe('https://api.linode.com/v4/images?page_size=1'),
      probe('https://api.linode.com/v4/networking/firewalls'),
      probe('https://api.linode.com/v4/lke/clusters'),
    ]);

    if (linodeListStatus === 401) {
      return sendError(res, 'Invalid API token — authentication failed');
    }

    const hasPermission = (status: number) => status !== 403 && status !== 401 && status !== 0;

    const linodeRead = hasPermission(linodeListStatus);
    // POST /linode/instances with empty body returns 400 (bad request) if write scope granted, 403 if not
    const linodeWrite = hasPermission(linodeWriteStatus);
    const accountRead = hasPermission(accountStatus);
    const domainsRead = hasPermission(domainsStatus);
    const volumesRead = hasPermission(volumesStatus);
    const nodebalancersRead = hasPermission(nodebalancersStatus);
    const databasesRead = hasPermission(databasesStatus);
    const imagesRead = hasPermission(imagesStatus);
    const firewallRead = hasPermission(firewallStatus);
    const lkeRead = hasPermission(lkeStatus);

    type Risk = 'critical' | 'high' | 'medium' | 'low' | 'ok';
    interface Permission {
      name: string;
      scope: string;
      present: boolean;
      required: boolean;
      risk: Risk;
      description: string;
    }

    const permissions: Permission[] = [
      {
        name: 'Linodes Read',
        scope: 'linodes:read_only',
        present: linodeRead,
        required: true,
        risk: linodeRead ? 'ok' : 'critical',
        description: 'Required to list and sync server instances',
      },
      {
        name: 'Linodes Write',
        scope: 'linodes:read_write',
        present: linodeWrite,
        required: false,
        risk: linodeWrite ? 'critical' : 'ok',
        description: 'Can create, modify, or delete your Linode instances — not needed for sync',
      },
      {
        name: 'Account Read',
        scope: 'account:read_only',
        present: accountRead,
        required: false,
        risk: accountRead ? 'high' : 'ok',
        description: 'Exposes billing, user, and account information — not needed for sync',
      },
      {
        name: 'Images Read',
        scope: 'images:read_only',
        present: imagesRead,
        required: false,
        risk: imagesRead ? 'low' : 'ok',
        description: 'Used to resolve OS image names — optional, ServerVault works without it',
      },
      {
        name: 'Domains Read',
        scope: 'domains:read_only',
        present: domainsRead,
        required: false,
        risk: domainsRead ? 'medium' : 'ok',
        description: 'Exposes DNS zone data — not needed for server sync',
      },
      {
        name: 'Volumes Read',
        scope: 'volumes:read_only',
        present: volumesRead,
        required: false,
        risk: volumesRead ? 'medium' : 'ok',
        description: 'Exposes block storage volume data — not needed for server sync',
      },
      {
        name: 'NodeBalancers Read',
        scope: 'nodebalancers:read_only',
        present: nodebalancersRead,
        required: false,
        risk: nodebalancersRead ? 'medium' : 'ok',
        description: 'Exposes load balancer configuration — not needed for server sync',
      },
      {
        name: 'Databases Read',
        scope: 'databases:read_only',
        present: databasesRead,
        required: false,
        risk: databasesRead ? 'medium' : 'ok',
        description: 'Exposes managed database info — not needed for server sync',
      },
      {
        name: 'Firewalls Read',
        scope: 'firewall:read_only',
        present: firewallRead,
        required: false,
        risk: firewallRead ? 'medium' : 'ok',
        description: 'Exposes firewall rules — not needed for server sync',
      },
      {
        name: 'Kubernetes (LKE) Read',
        scope: 'lke:read_only',
        present: lkeRead,
        required: false,
        risk: lkeRead ? 'medium' : 'ok',
        description: 'Exposes Kubernetes cluster data — not needed for server sync',
      },
    ];

    const criticalCount = permissions.filter(p => p.risk === 'critical' && p.present && !p.required).length;
    const highCount = permissions.filter(p => p.risk === 'high' && p.present && !p.required).length;
    const unnecessaryCount = permissions.filter(p => p.present && !p.required).length;

    let overallRisk: Risk = 'ok';
    if (criticalCount > 0) overallRisk = 'critical';
    else if (highCount > 0) overallRisk = 'high';
    else if (unnecessaryCount > 0) overallRisk = 'medium';
    else if (!linodeRead) overallRisk = 'critical';

    sendSuccess(res, {
      valid: linodeRead,
      overallRisk,
      unnecessaryCount,
      permissions,
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// GET / - List all cloud providers (without api_token)
router.get('/', adminAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, provider, auto_sync, sync_hour, sync_interval_minutes, last_sync_at, server_count, created_at
      FROM cloud_providers
      ORDER BY created_at DESC
    `);
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// POST / - Add new cloud provider
router.post('/', adminAuth, async (req, res) => {
  try {
    const parsed = createProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.issues[0].message);
    }

    const { name, provider, api_token, auto_sync, sync_hour, sync_interval_minutes } = parsed.data;

    // Validate provider type against registry
    const supported = getSupportedProviders();
    if (supported.length > 0 && !supported.includes(provider)) {
      return sendError(res, `Unsupported provider type: ${provider}. Supported: ${supported.join(', ')}`);
    }

    const result = await db.query(
      `INSERT INTO cloud_providers (name, provider, api_token, auto_sync, sync_hour, sync_interval_minutes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, provider, auto_sync, sync_hour, sync_interval_minutes, last_sync_at, server_count, created_at`,
      [name, provider, api_token, auto_sync, sync_hour, sync_interval_minutes]
    );

    sendSuccess(res, result.rows[0], 201);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// DELETE /:id - Delete provider and linked servers
router.delete('/:id', adminAuth, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const providerId = parseInt(req.params.id as string, 10);
    if (isNaN(providerId)) {
      return sendError(res, 'Invalid provider ID');
    }

    await client.query('BEGIN');

    // Check if provider exists
    const providerCheck = await client.query(
      'SELECT id FROM cloud_providers WHERE id = $1',
      [providerId]
    );
    if (providerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Cloud provider not found', 404);
    }

    // Delete servers linked to this provider
    await client.query(
      'DELETE FROM servers WHERE cloud_provider_id = $1',
      [providerId]
    );

    // Delete the provider
    await client.query(
      'DELETE FROM cloud_providers WHERE id = $1',
      [providerId]
    );

    await client.query('COMMIT');
    sendSuccess(res, { deleted: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    sendError(res, err.message);
  } finally {
    client.release();
  }
});

// PATCH /:id - Update provider (name, auto_sync)
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id as string, 10);
    if (isNaN(providerId)) {
      return sendError(res, 'Invalid provider ID');
    }

    const parsed = updateProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.issues[0].message);
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return sendError(res, 'No fields to update');
    }

    // Build dynamic update query
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.auto_sync !== undefined) {
      setClauses.push(`auto_sync = $${paramIndex++}`);
      values.push(updates.auto_sync);
    }
    if (updates.sync_hour !== undefined) {
      setClauses.push(`sync_hour = $${paramIndex++}`);
      values.push(updates.sync_hour);
    }
    if (updates.sync_interval_minutes !== undefined) {
      setClauses.push(`sync_interval_minutes = $${paramIndex++}`);
      values.push(updates.sync_interval_minutes);
    }

    values.push(providerId);

    const result = await db.query(
      `UPDATE cloud_providers
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, provider, auto_sync, sync_hour, sync_interval_minutes, last_sync_at, server_count, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return sendError(res, 'Cloud provider not found', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// POST /:id/sync - Manually sync servers from this provider
router.post('/:id/sync', adminAuth, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id as string, 10);
    if (isNaN(providerId)) {
      return sendError(res, 'Invalid provider ID');
    }

    // Get the provider with api_token
    const providerResult = await db.query(
      'SELECT id, name, provider, api_token FROM cloud_providers WHERE id = $1',
      [providerId]
    );

    if (providerResult.rows.length === 0) {
      return sendError(res, 'Cloud provider not found', 404);
    }

    const provider = providerResult.rows[0] as {
      id: number;
      name: string;
      provider: string;
      api_token: string;
    };

    const syncFn = getSyncFn(provider.provider);
    if (!syncFn) {
      return sendError(res, `Unsupported provider type: ${provider.provider}`);
    }

    // Manual sync: always pass null hash to force a full sync regardless of delta
    const syncResult = await syncFn(provider.id, provider.api_token, provider.name, null);

    sendSuccess(res, {
      synced: syncResult.count,
      provider_name: provider.name,
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
