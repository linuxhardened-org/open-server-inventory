import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { generateApiToken, hashApiToken } from '../utils/token';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';

const router = Router();

const createBody = z.object({
  name: z.string().min(1, 'Name is required'),
});

router.get('/', sessionAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, created_at, last_used_at FROM api_tokens WHERE user_id = $1', [req.session.userId]);
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', sessionAuth, async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input');

  try {
    const { name } = parsed.data;
    const token = generateApiToken();
    const tokenHash = hashApiToken(token);
    await db.query(
      'INSERT INTO api_tokens (user_id, name, token_hash) VALUES ($1, $2, $3)',
      [req.session.userId, name, tokenHash]
    );
    sendSuccess(res, { name, token });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.delete('/:id', sessionAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM api_tokens WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    sendSuccess(res, { message: 'Token revoked' });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
