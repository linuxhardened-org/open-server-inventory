import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

const ipSchema = z.object({
  server_id: z.number(),
  ip_address: z.string().min(1),
  ip_type: z.enum(['public', 'private', 'ipv6']).default('public'),
  label: z.string().optional(),
});

// GET / - List all IPs with server info
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        ip.id, ip.ip_address, ip.ip_type, ip.label, ip.created_at,
        ip.server_id, s.name as server_name, s.hostname as server_hostname
      FROM server_ips ip
      JOIN servers s ON s.id = ip.server_id
      ORDER BY ip.ip_address
    `);
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// GET /server/:serverId - Get IPs for a specific server
router.get('/server/:serverId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM server_ips WHERE server_id = $1 ORDER BY ip_type, ip_address',
      [req.params.serverId]
    );
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// POST / - Add new IP
router.post('/', async (req, res) => {
  const parsed = ipSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.issues[0].message);

  try {
    const { server_id, ip_address, ip_type, label } = parsed.data;
    const result = await db.query(
      'INSERT INTO server_ips (server_id, ip_address, ip_type, label) VALUES ($1, $2, $3, $4) RETURNING *',
      [server_id, ip_address, ip_type, label || null]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// PUT /:id - Update IP
router.put('/:id', async (req, res) => {
  const parsed = ipSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.issues[0].message);

  try {
    const { ip_address, ip_type, label } = parsed.data;
    const result = await db.query(
      `UPDATE server_ips SET
        ip_address = COALESCE($1, ip_address),
        ip_type = COALESCE($2, ip_type),
        label = COALESCE($3, label)
      WHERE id = $4 RETURNING *`,
      [ip_address, ip_type, label, req.params.id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'IP not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// DELETE /:id - Delete IP
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM server_ips WHERE id = $1', [req.params.id]);
    sendSuccess(res, { message: 'IP deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
