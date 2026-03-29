import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { sendError } from '../utils/response';
import { hashApiToken } from '../utils/token';

export const bearerAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Unauthorized: Bearer token required', 401);
  }

  const rawToken = authHeader.slice('Bearer '.length).trim();
  if (!rawToken) {
    return sendError(res, 'Unauthorized: Bearer token required', 401);
  }

  const tokenHash = hashApiToken(rawToken);

  try {
    const result = await db.query('SELECT * FROM api_tokens WHERE token_hash = $1', [tokenHash]);
    const apiToken = result.rows[0] as { id: number; user_id: number } | undefined;

    if (apiToken) {
      await db.query('UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiToken.id]);
      req.userId = apiToken.user_id;
      next();
    } else {
      sendError(res, 'Unauthorized: Invalid API token', 401);
    }
  } catch (error) {
    console.error('Database error in bearerAuth:', error);
    sendError(res, 'Internal Server Error', 500);
  }
};
