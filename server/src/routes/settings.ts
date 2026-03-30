import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// GET /api/settings — any authenticated user
router.get('/', async (_req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM app_settings');
    const settings: Record<string, string> = {};
    for (const row of result.rows as { key: string; value: string }[]) {
      settings[row.key] = row.value;
    }
    sendSuccess(res, settings);
  } catch (err: any) {
    sendError(res, err.message || 'Failed to load settings');
  }
});

// PUT /api/settings — any authenticated user can update
router.put('/', async (req, res) => {
  const schema = z.object({
    app_name: z.string().trim().min(1).max(80).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input', 400);

  try {
    const { app_name } = parsed.data;
    if (app_name !== undefined) {
      await db.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        ['app_name', app_name]
      );
    }
    sendSuccess(res, { app_name });
  } catch (err: any) {
    sendError(res, err.message || 'Failed to save settings');
  }
});

export default router;
