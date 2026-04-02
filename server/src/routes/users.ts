import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { hashPassword } from '../utils/crypto';
import { sendSuccess, sendError } from '../utils/response';
import { adminAuth } from '../middleware/adminAuth';
import { sessionAuth } from '../middleware/sessionAuth';

const router = Router();

// Only admins can access these routes
router.use(sessionAuth, adminAuth);

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, real_name, profile_picture_url, role, totp_enabled, created_at FROM users');
    sendSuccess(res, result.rows);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(8),
    real_name: z.string().max(255).optional(),
    role: z.enum(['admin', 'operator']).default('operator')
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  const { username, password, real_name, role } = parseResult.data;

  try {
    const hashedPassword = await hashPassword(password);
    await db.query(
      'INSERT INTO users (username, password_hash, real_name, role) VALUES ($1, $2, $3, $4)',
      [username, hashedPassword, real_name || null, role]
    );
    sendSuccess(res, { message: 'User created' }, 201);
  } catch (err: any) {
    if (err.message.includes('unique constraint') || err.code === '23505') {
      return sendError(res, 'Username already exists');
    }
    sendError(res, `Failed to create user: ${err.message}`);
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Prevent deleting oneself
  if (parseInt(id) === req.session.userId) {
    return sendError(res, 'You cannot delete yourself');
  }

  try {
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount && result.rowCount > 0) {
      sendSuccess(res, { message: 'User deleted' });
    } else {
      sendError(res, 'User not found');
    }
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.patch('/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== 'admin' && role !== 'operator') {
    return sendError(res, 'Invalid role');
  }

  // Prevent changing one's own role
  if (parseInt(id) === req.session.userId) {
    return sendError(res, 'You cannot change your own role');
  }

  try {
    const result = await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    if (result.rowCount && result.rowCount > 0) {
      sendSuccess(res, { message: 'User role updated' });
    } else {
      sendError(res, 'User not found');
    }
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// Update user (admin can update any user, users can update their own real_name)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);
  const isAdmin = req.session.role === 'admin';
  const isSelf = userId === req.session.userId;

  if (!isAdmin && !isSelf) {
    return sendError(res, 'You can only update your own profile', 403);
  }

  const schema = z.object({
    real_name: z.string().max(255).nullable().optional(),
    profile_picture_url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v),
        'Profile picture URL must be an absolute http(s) URL or app-relative path'
      )
      .nullable()
      .optional(),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  const { real_name, profile_picture_url } = parseResult.data;

  try {
    const result = await db.query(
      'UPDATE users SET real_name = $1, profile_picture_url = $2 WHERE id = $3 RETURNING id, username, real_name, profile_picture_url, role',
      [real_name ?? null, profile_picture_url ?? null, userId]
    );
    if (result.rowCount && result.rowCount > 0) {
      sendSuccess(res, result.rows[0]);
    } else {
      sendError(res, 'User not found');
    }
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
