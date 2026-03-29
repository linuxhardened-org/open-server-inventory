import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

const sshKeySchema = z.object({
  name: z.string(),
  public_key: z.string(),
  private_key: z.string().optional()
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, public_key, created_at, CASE WHEN private_key IS NOT NULL THEN TRUE ELSE FALSE END as has_private_key FROM ssh_keys');
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', async (req, res) => {
  const parseResult = sshKeySchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');
  
  try {
    const { name, public_key, private_key } = parseResult.data;
    const result = await db.query(
      'INSERT INTO ssh_keys (name, public_key, private_key) VALUES ($1, $2, $3) RETURNING id',
      [name, public_key, private_key || null]
    );
    sendSuccess(res, { id: result.rows[0].id, name }, 201);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM ssh_keys WHERE id = $1', [req.params.id]);
    sendSuccess(res, { message: 'SSH Key deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
