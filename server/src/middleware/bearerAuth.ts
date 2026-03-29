import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { sendError } from '../utils/response';

export const bearerAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Unauthorized: Bearer token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const result = await db.query('SELECT * FROM api_tokens WHERE token = $1', [token]);
    const apiToken = result.rows[0] as any;

    if (apiToken) {
      await db.query('UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiToken.id]);
      (req as any).userId = apiToken.user_id;
      next();
    } else {
      sendError(res, 'Unauthorized: Invalid API token', 401);
    }
  } catch (error) {
    console.error('Database error in bearerAuth:', error);
    sendError(res, 'Internal Server Error', 500);
  }
};
