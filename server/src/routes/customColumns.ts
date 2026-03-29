import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { slugifyName } from '../utils/slug';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const r = await db.query(
      'SELECT id, name, key, position, created_at FROM custom_columns ORDER BY position ASC, id ASC'
    );
    sendSuccess(res, r.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', async (req, res) => {
  const parse = z.object({ name: z.string().min(1).max(200) }).safeParse(req.body);
  if (!parse.success) return sendError(res, 'Invalid input');

  try {
    let key = slugifyName(parse.data.name);
    const exists = await db.query('SELECT 1 FROM custom_columns WHERE key = $1', [key]);
    if (exists.rows.length) {
      key = `${key}_${Date.now().toString(36)}`;
    }

    const posR = await db.query('SELECT COALESCE(MAX(position), -1) + 1 AS n FROM custom_columns');
    const position = Number(posR.rows[0].n);

    const ins = await db.query(
      'INSERT INTO custom_columns (name, key, position) VALUES ($1, $2, $3) RETURNING id, name, key, position, created_at',
      [parse.data.name.trim(), key, position]
    );
    sendSuccess(res, ins.rows[0], 201);
  } catch (err: any) {
    if (err.code === '23505') return sendError(res, 'A column with this key already exists');
    sendError(res, err.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM custom_columns WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rowCount) return sendError(res, 'Column not found', 404);
    sendSuccess(res, { message: 'Column removed' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
