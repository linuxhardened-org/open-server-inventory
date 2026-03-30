import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { adminAuth } from '../middleware/adminAuth';
import { syncLinodeProvider } from '../utils/cloudSync';

const router = Router();

const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.enum(['linode']).default('linode'),
  api_token: z.string().min(1, 'API token is required'),
  auto_sync: z.boolean().default(true),
  sync_hour: z.number().int().min(0).max(23).default(0),
});

const updateProviderSchema = z.object({
  name: z.string().min(1).optional(),
  auto_sync: z.boolean().optional(),
  sync_hour: z.number().int().min(0).max(23).optional(),
});

// GET / - List all cloud providers (without api_token)
router.get('/', adminAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, provider, auto_sync, sync_hour, last_sync_at, server_count, created_at
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

    const { name, provider, api_token, auto_sync, sync_hour } = parsed.data;

    const result = await db.query(
      `INSERT INTO cloud_providers (name, provider, api_token, auto_sync, sync_hour)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, provider, auto_sync, sync_hour, last_sync_at, server_count, created_at`,
      [name, provider, api_token, auto_sync, sync_hour]
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

    values.push(providerId);

    const result = await db.query(
      `UPDATE cloud_providers
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, provider, auto_sync, sync_hour, last_sync_at, server_count, created_at`,
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

    if (provider.provider !== 'linode') {
      return sendError(res, `Unsupported provider type: ${provider.provider}`);
    }

    // Use shared sync function
    const syncedCount = await syncLinodeProvider(provider.id, provider.api_token);

    sendSuccess(res, {
      synced: syncedCount,
      provider_name: provider.name,
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
