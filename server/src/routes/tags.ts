import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

const tagSchema = z.object({
  name: z.string(),
  color: z.string()
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tags');
    sendSuccess(res, result.rows);
  } catch (error: any) {
    sendError(res, error.message);
  }
});

router.post('/', async (req, res) => {
  const parseResult = tagSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');
  
  try {
    const { name, color } = parseResult.data;
    const result = await db.query(
      'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING id',
      [name, color]
    );
    sendSuccess(res, { id: result.rows[0].id, name, color }, 201);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.put('/:id', async (req, res) => {
  const parseResult = tagSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');
  
  try {
    const { name, color } = parseResult.data;
    await db.query(
      'UPDATE tags SET name = $1, color = $2 WHERE id = $3',
      [name, color, req.params.id]
    );
    sendSuccess(res, { id: req.params.id, name, color });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tags WHERE id = $1', [req.params.id]);
    sendSuccess(res, { message: 'Tag deleted' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
