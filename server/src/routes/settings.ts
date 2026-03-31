import { Router } from 'express';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import db from '../db';
import { env } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';
import { adminAuth } from '../middleware/adminAuth';
import { verifyPassword } from '../utils/crypto';

const router = Router();

/** After wiping inventory rows, align serial sequences with empty tables */
const INVENTORY_SEQUENCES: { table: string; sequence: string }[] = [
  { table: 'groups', sequence: 'groups_id_seq' },
  { table: 'tags', sequence: 'tags_id_seq' },
  { table: 'ssh_keys', sequence: 'ssh_keys_id_seq' },
  { table: 'custom_columns', sequence: 'custom_columns_id_seq' },
  { table: 'servers', sequence: 'servers_id_seq' },
  { table: 'server_disks', sequence: 'server_disks_id_seq' },
  { table: 'server_interfaces', sequence: 'server_interfaces_id_seq' },
  { table: 'server_ips', sequence: 'server_ips_id_seq' },
  { table: 'server_history', sequence: 'server_history_id_seq' },
  { table: 'cloud_providers', sequence: 'cloud_providers_id_seq' },
];

async function syncSequence(client: PoolClient, table: string, sequence: string): Promise<void> {
  const maxR = await client.query(`SELECT MAX(id) AS m FROM ${table}`);
  const m = maxR.rows[0].m as number | null;
  if (m === null) {
    await client.query('SELECT setval($1::regclass, 1, false)', [sequence]);
  } else {
    await client.query('SELECT setval($1::regclass, $2::bigint, true)', [sequence, m]);
  }
}

// GET /api/settings — any authenticated user
router.get('/', async (_req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM app_settings');
    const settings: Record<string, string> = {};
    for (const row of result.rows as { key: string; value: string }[]) {
      settings[row.key] = row.value;
    }
    // Expose which DB backend is active (without revealing credentials)
    const dbUrl = env.databaseUrl;
    settings._db_provider = dbUrl
      ? dbUrl.includes('supabase.com') ? 'supabase' : 'external'
      : 'local';
    sendSuccess(res, settings);
  } catch (err: any) {
    sendError(res, err.message || 'Failed to load settings');
  }
});

// GET /api/settings/db-status — test DB connectivity
router.get('/db-status', async (_req, res) => {
  try {
    const result = await db.query('SELECT version() AS version');
    const version = (result.rows[0] as { version: string }).version;
    const dbUrl = env.databaseUrl;
    sendSuccess(res, {
      connected: true,
      provider: dbUrl
        ? dbUrl.includes('supabase.com') ? 'supabase' : 'external'
        : 'local',
      version: version.split(' ').slice(0, 2).join(' '),
    });
  } catch (err: any) {
    sendSuccess(res, { connected: false, error: err.message });
  }
});

// PUT /api/settings — admin only (session); renames app for all users
router.put('/', sessionAuth, adminAuth, async (req, res) => {
  const schema = z.object({
    app_name: z.string().trim().min(1).max(80).optional(),
    app_logo_url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
        'Logo must be an uploaded image data URL, an absolute http(s) URL, or app-relative path (e.g. /images/logo.png)'
      )
      .optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input', 400);

  try {
    const { app_name, app_logo_url } = parsed.data;
    if (app_name !== undefined) {
      await db.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        ['app_name', app_name]
      );
    }
    if (app_logo_url !== undefined) {
      await db.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        ['app_logo_url', app_logo_url]
      );
    }
    sendSuccess(res, { app_name, app_logo_url });
  } catch (err: any) {
    sendError(res, err.message || 'Failed to save settings');
  }
});

// POST /api/settings/reset — admin only; wipe inventory, keep users & tokens
router.post('/reset', sessionAuth, adminAuth, async (req, res) => {
  const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Password required', 400);

  const { password } = parsed.data;
  const userId = req.session!.userId;

  try {
    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const row = userResult.rows[0] as { password_hash: string } | undefined;
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return sendError(res, 'Invalid password', 401);
    }
  } catch (err: any) {
    return sendError(res, err.message || 'Could not verify password');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM servers');
    await client.query('DELETE FROM groups');
    await client.query('DELETE FROM tags');
    await client.query('DELETE FROM ssh_keys');
    await client.query('DELETE FROM custom_columns');
    await client.query('DELETE FROM cloud_providers');
    for (const { table, sequence } of INVENTORY_SEQUENCES) {
      await syncSequence(client, table, sequence);
    }
    await client.query('COMMIT');
    sendSuccess(res, { message: 'Inventory data reset' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    sendError(res, err.message || 'Reset failed', 500);
  } finally {
    client.release();
  }
});

export default router;
