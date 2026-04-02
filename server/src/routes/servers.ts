import { Router } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { groupBy } from '../utils/collections';
import { getActorUserId } from '../utils/requestContext';

const router = Router();

const serverSchema = z.object({
  name: z.string(),
  hostname: z.string(),
  ip_address: z.string().optional(),
  private_ip: z.string().optional(),
  ipv6_address: z.string().optional(),
  private_ipv6: z.string().optional(),
  os: z.string().optional(),
  cpu_cores: z.number().optional(),
  ram_gb: z.number().optional(),
  group_id: z.number().nullable().optional(),
  ssh_key_id: z.number().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.number()).optional(),
  /** Map of custom column id (string) -> value */
  custom_values: z.record(z.string(), z.string().nullable()).optional(),
});

async function attachCustomValues(serverIds: number[]): Promise<Map<number, Record<string, string>>> {
  const map = new Map<number, Record<string, string>>();
  if (serverIds.length === 0) return map;
  const r = await db.query(
    'SELECT server_id, custom_column_id, value FROM server_custom_values WHERE server_id = ANY($1::int[])',
    [serverIds]
  );
  for (const row of r.rows as { server_id: number; custom_column_id: number; value: string | null }[]) {
    const cur = map.get(row.server_id) ?? {};
    cur[String(row.custom_column_id)] = row.value ?? '';
    map.set(row.server_id, cur);
  }
  return map;
}

async function saveCustomValues(
  client: PoolClient,
  serverId: number,
  customValues: Record<string, string | null> | undefined
): Promise<void> {
  if (customValues === undefined) return;
  await client.query('DELETE FROM server_custom_values WHERE server_id = $1', [serverId]);
  for (const [colIdStr, val] of Object.entries(customValues)) {
    const colId = parseInt(colIdStr, 10);
    if (Number.isNaN(colId)) continue;
    const col = await client.query('SELECT id FROM custom_columns WHERE id = $1', [colId]);
    if (!col.rows.length) continue;
    await client.query(
      'INSERT INTO server_custom_values (server_id, custom_column_id, value) VALUES ($1, $2, $3)',
      [serverId, colId, val ?? null]
    );
  }
}

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '5000'), 10) || 5000, 5000);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    
    // Fetch total count for pagination
    const countRes = await db.query('SELECT COUNT(*)::int AS count FROM servers');
    const total = (countRes.rows[0] as { count: number }).count;

    const serversResult = await db.query(`
      SELECT s.*, g.name as group_name, k.name as ssh_key_name
      FROM servers s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN ssh_keys k ON s.ssh_key_id = k.id
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const rows = serversResult.rows as Record<string, unknown>[];
    const ids = rows.map((s) => s.id as number);
    if (ids.length === 0) {
      return sendSuccess(res, { servers: [], total });
    }

    const [disksRes, interfacesRes, tagsRes] = await Promise.all([
      db.query('SELECT * FROM server_disks WHERE server_id = ANY($1::int[])', [ids]),
      db.query('SELECT * FROM server_interfaces WHERE server_id = ANY($1::int[])', [ids]),
      db.query(
        `
        SELECT st.server_id, t.id, t.name, t.color
        FROM server_tags st
        JOIN tags t ON t.id = st.tag_id
        WHERE st.server_id = ANY($1::int[])
      `,
        [ids]
      ),
    ]);

    const disksBy = groupBy(disksRes.rows as { server_id: number }[], 'server_id');
    const ifBy = groupBy(interfacesRes.rows as { server_id: number }[], 'server_id');

    const tagsByServer = new Map<number, { id: number; name: string; color: string | null }[]>();
    for (const r of tagsRes.rows as {
      server_id: number;
      id: number;
      name: string;
      color: string | null;
    }[]) {
      const list = tagsByServer.get(r.server_id) ?? [];
      list.push({ id: r.id, name: r.name, color: r.color });
      tagsByServer.set(r.server_id, list);
    }

    const customMap = await attachCustomValues(ids);

    const results = rows.map((s) => {
      const id = s.id as number;
      return {
        ...s,
        disks: disksBy.get(String(id)) ?? [],
        interfaces: ifBy.get(String(id)) ?? [],
        tags: tagsByServer.get(id) ?? [],
        custom_values: customMap.get(id) ?? {},
      };
    });

    sendSuccess(res, { servers: results, total });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, g.name as group_name, k.name as ssh_key_name
      FROM servers s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN ssh_keys k ON s.ssh_key_id = k.id
      WHERE s.id = $1
    `, [req.params.id]);

    const s = result.rows[0] as any;
    if (!s) return sendError(res, 'Server not found', 404);

    const disksResult = await db.query('SELECT * FROM server_disks WHERE server_id = $1', [s.id]);
    const interfacesResult = await db.query('SELECT * FROM server_interfaces WHERE server_id = $1', [s.id]);
    const tagsResult = await db.query(`
      SELECT t.* FROM tags t
      JOIN server_tags st ON t.id = st.tag_id
      WHERE st.server_id = $1
    `, [s.id]);
    const historyResult = await db.query(`
      SELECT h.*, u.username
      FROM server_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.server_id = $1
      ORDER BY h.created_at DESC
    `, [s.id]);

    sendSuccess(res, { 
      ...s, 
      disks: disksResult.rows, 
      interfaces: interfacesResult.rows, 
      tags: tagsResult.rows, 
      history: historyResult.rows 
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', async (req, res) => {
  const parseResult = serverSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  const { tags, custom_values, ...data } = parseResult.data;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const insertResult = await client.query(`
      INSERT INTO servers (name, hostname, ip_address, private_ip, ipv6_address, private_ipv6, os, cpu_cores, ram_gb, group_id, ssh_key_id, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [data.name, data.hostname, data.ip_address || null, data.private_ip || null, data.ipv6_address || null, data.private_ipv6 || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null]);

    const serverId = insertResult.rows[0].id;

    await saveCustomValues(client, serverId, custom_values);

    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
      }
    }

    const userId = getActorUserId(req);
    await client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)', [
      serverId,
      userId ?? null,
      'Server created',
    ]);
    
    await client.query('COMMIT');
    sendSuccess(res, { id: serverId }, 201);
  } catch (err: any) {
    await client.query('ROLLBACK');
    sendError(res, err.message);
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const parseResult = serverSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  const { tags, custom_values, ...data } = parseResult.data;
  const serverId = req.params.id;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE servers SET name = $1, hostname = $2, ip_address = $3, private_ip = $4, ipv6_address = $5, private_ipv6 = $6, os = $7, cpu_cores = $8, ram_gb = $9, group_id = $10, ssh_key_id = $11, status = $12, notes = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
    `, [data.name, data.hostname, data.ip_address || null, data.private_ip || null, data.ipv6_address || null, data.private_ipv6 || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null, serverId]);

    if (custom_values !== undefined) {
      await saveCustomValues(client, Number(serverId), custom_values);
    }

    if (tags) {
      await client.query('DELETE FROM server_tags WHERE server_id = $1', [serverId]);
      for (const tagId of tags) {
        await client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
      }
    }

    const userId = getActorUserId(req);
    await client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)', [
      serverId,
      userId ?? null,
      'Server updated',
    ]);
    
    await client.query('COMMIT');
    sendSuccess(res, { message: 'Server updated' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    sendError(res, err.message);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM servers WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
      return sendError(res, 'Server not found', 404);
    }
    sendSuccess(res, { message: 'Server deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// Disk Management
router.post('/:id/disks', async (req, res) => {
  const schema = z.object({ device: z.string(), size_gb: z.number(), mount_point: z.string().optional(), type: z.string().optional() });
  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  try {
    const result = await db.query('INSERT INTO server_disks (server_id, device, size_gb, mount_point, type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.params.id, parseResult.data.device, parseResult.data.size_gb, parseResult.data.mount_point || null, parseResult.data.type || null]);
    sendSuccess(res, { id: result.rows[0].id });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.delete('/:id/disks/:diskId', async (req, res) => {
  try {
    await db.query('DELETE FROM server_disks WHERE id = $1 AND server_id = $2', [req.params.diskId, req.params.id]);
    sendSuccess(res, { message: 'Disk deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// Interface Management
router.post('/:id/interfaces', async (req, res) => {
  const schema = z.object({ name: z.string(), mac_address: z.string().optional(), ip_address: z.string().optional(), type: z.string().optional() });
  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  try {
    const result = await db.query('INSERT INTO server_interfaces (server_id, name, mac_address, ip_address, type) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.params.id, parseResult.data.name, parseResult.data.mac_address || null, parseResult.data.ip_address || null, parseResult.data.type || null]);
    sendSuccess(res, { id: result.rows[0].id });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.delete('/:id/interfaces/:ifaceId', async (req, res) => {
  try {
    await db.query('DELETE FROM server_interfaces WHERE id = $1 AND server_id = $2', [req.params.ifaceId, req.params.id]);
    sendSuccess(res, { message: 'Interface deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
