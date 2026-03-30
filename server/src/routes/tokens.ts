import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { generateApiToken, hashApiToken } from '../utils/token';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';

const router = Router();

// Expiry options: 7d, 30d, 90d, 365d, never (null)
const expiryOptions = ['7d', '30d', '90d', '365d', 'never'] as const;

const createBody = z.object({
  name: z.string().min(1, 'Name is required'),
  expiry: z.enum(expiryOptions).optional().default('never'),
});

function calculateExpiryDate(expiry: string): Date | null {
  if (expiry === 'never') return null;
  const days = parseInt(expiry);
  if (isNaN(days)) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

router.get('/', sessionAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, expires_at, created_at, last_used_at FROM api_tokens WHERE user_id = $1',
      [req.session.userId]
    );
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', sessionAuth, async (req, res) => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input');

  try {
    const { name, expiry } = parsed.data;
    const token = generateApiToken();
    const tokenHash = hashApiToken(token);
    const expiresAt = calculateExpiryDate(expiry);

    await db.query(
      'INSERT INTO api_tokens (user_id, name, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [req.session.userId, name, tokenHash, expiresAt]
    );
    sendSuccess(res, { name, token, expires_at: expiresAt });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/:id/regenerate', sessionAuth, async (req, res) => {
  try {
    // Verify ownership
    const existing = await db.query(
      'SELECT id, name FROM api_tokens WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (existing.rows.length === 0) {
      return sendError(res, 'Token not found', 404);
    }

    const token = generateApiToken();
    const tokenHash = hashApiToken(token);
    await db.query(
      'UPDATE api_tokens SET token_hash = $1, created_at = CURRENT_TIMESTAMP WHERE id = $2',
      [tokenHash, req.params.id]
    );
    sendSuccess(res, { name: existing.rows[0].name, token });
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
