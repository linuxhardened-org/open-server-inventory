import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { generateApiToken } from '../utils/token';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';

const router = Router();

router.get('/', sessionAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, created_at, last_used_at FROM api_tokens WHERE user_id = $1', [req.session.userId]);
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', sessionAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, 'Name is required');
    
    const token = generateApiToken();
    await db.query(
      'INSERT INTO api_tokens (user_id, name, token) VALUES ($1, $2, $3)',
      [req.session.userId, name, token]
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
