import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

const groupSchema = z.object({
  name: z.string(),
  description: z.string().optional()
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT g.*, COUNT(s.id)::int AS "serverCount"
      FROM groups g
      LEFT JOIN servers s ON s.group_id = g.id
      GROUP BY g.id
      ORDER BY g.name
    `);
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', async (req, res) => {
  const parseResult = groupSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');
  
  try {
    const { name, description } = parseResult.data;
    const result = await db.query('INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id', [name, description || null]);
    sendSuccess(res, { id: result.rows[0].id, name, description }, 201);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.put('/:id', async (req, res) => {
  const parseResult = groupSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');
  
  try {
    const { name, description } = parseResult.data;
    await db.query('UPDATE groups SET name = $1, description = $2 WHERE id = $3', [name, description || null, req.params.id]);
    sendSuccess(res, { id: req.params.id, name, description });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    sendSuccess(res, { message: 'Group deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
