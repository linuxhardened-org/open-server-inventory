import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

const serverSchema = z.object({
  name: z.string(),
  hostname: z.string(),
  ip_address: z.string().optional(),
  os: z.string().optional(),
  cpu_cores: z.number().optional(),
  ram_gb: z.number().optional(),
  group_id: z.number().nullable().optional(),
  ssh_key_id: z.number().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.number()).optional(),
});

router.get('/', async (req, res) => {
  try {
    const serversResult = await db.query(`
      SELECT s.*, g.name as group_name, k.name as ssh_key_name
      FROM servers s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN ssh_keys k ON s.ssh_key_id = k.id
    `);
    
    const results = await Promise.all(serversResult.rows.map(async (s: any) => {
      const disksResult = await db.query('SELECT * FROM server_disks WHERE server_id = $1', [s.id]);
      const interfacesResult = await db.query('SELECT * FROM server_interfaces WHERE server_id = $1', [s.id]);
      const tagsResult = await db.query(`
        SELECT t.* FROM tags t
        JOIN server_tags st ON t.id = st.tag_id
        WHERE st.server_id = $1
      `, [s.id]);
      return { ...s, disks: disksResult.rows, interfaces: interfacesResult.rows, tags: tagsResult.rows };
    }));
    
    sendSuccess(res, results);
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

  const { tags, ...data } = parseResult.data;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const insertResult = await client.query(`
      INSERT INTO servers (name, hostname, ip_address, os, cpu_cores, ram_gb, group_id, ssh_key_id, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [data.name, data.hostname, data.ip_address || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null]);
    
    const serverId = insertResult.rows[0].id;
    
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
      }
    }

    const userId = (req as any).userId || (req.session as any).userId;
    await client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)',
      [serverId, userId, 'Server created']);
    
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

  const { tags, ...data } = parseResult.data;
  const serverId = req.params.id;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE servers SET name = $1, hostname = $2, ip_address = $3, os = $4, cpu_cores = $5, ram_gb = $6, group_id = $7, ssh_key_id = $8, status = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
    `, [data.name, data.hostname, data.ip_address || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null, serverId]);

    if (tags) {
      await client.query('DELETE FROM server_tags WHERE server_id = $1', [serverId]);
      for (const tagId of tags) {
        await client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
      }
    }

    const userId = (req as any).userId || (req.session as any).userId;
    await client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)',
      [serverId, userId, 'Server updated']);
    
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
    await db.query('DELETE FROM servers WHERE id = $1', [req.params.id]);
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
