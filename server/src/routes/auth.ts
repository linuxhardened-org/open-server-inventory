import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { verifyPassword, hashPassword } from '../utils/crypto';
import { generateTotpSecret, generateTotpUri, verifyTotp } from '../utils/totp';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totpToken: z.string().optional(),
});

const setupSchema = z.object({
  username: z.string().trim().min(3),
  password: z.string().min(8),
  app_name: z.string().trim().min(1).max(80).optional(),
});

router.post('/setup', async (req, res) => {
  const parsed = setupSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input');

  try {
    const countResult = await db.query('SELECT COUNT(*)::int AS count FROM users');
    const existingUsers = (countResult.rows[0] as { count: number }).count;
    if (existingUsers > 0) {
      return sendError(res, 'Setup already completed', 409);
    }

    const { username, password, app_name } = parsed.data;
    const passwordHash = await hashPassword(password);

    if (app_name) {
      await db.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        ['app_name', app_name]
      );
    }

    const created = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, totp_enabled',
      [username, passwordHash, 'admin']
    );
    const user = created.rows[0] as {
      id: number;
      username: string;
      role: string;
      totp_enabled: boolean;
    };

    req.session.regenerate((regErr) => {
      if (regErr) {
        console.error('session regenerate:', regErr);
        return sendError(res, 'Could not create session', 500);
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      sendSuccess(
        res,
        {
          id: user.id,
          username: user.username,
          role: user.role,
          totpEnabled: !!user.totp_enabled,
        },
        201
      );
    });
  } catch (err: any) {
    if (err?.code === '23505') return sendError(res, 'Username already exists', 409);
    sendError(res, err.message || 'Setup failed');
  }
});

router.get('/setup-status', async (_req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS count FROM users');
    const count = (result.rows[0] as { count: number }).count;
    sendSuccess(res, { isSetupCompleted: count > 0 });
  } catch (err: any) {
    sendError(res, err.message || 'Could not check setup status', 500);
  }
});

router.post('/login', async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  try {
    const { username, password, totpToken } = parseResult.data;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0] as {
      id: number;
      username: string;
      role: string;
      password_hash: string;
      totp_enabled: boolean;
      totp_secret: string | null;
    } | undefined;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return sendError(res, 'Invalid username or password', 401);
    }

    if (user.totp_enabled) {
      if (!totpToken || !user.totp_secret || !verifyTotp(totpToken, user.totp_secret)) {
        return sendError(res, 'Invalid TOTP token', 401);
      }
    }

    req.session.regenerate((regErr) => {
      if (regErr) {
        console.error('session regenerate:', regErr);
        return sendError(res, 'Could not create session', 500);
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;
      sendSuccess(res, {
        id: user.id,
        username: user.username,
        role: user.role,
        totpEnabled: !!user.totp_enabled,
      });
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    sendSuccess(res, { message: 'Logged out' });
  });
});

router.get('/me', sessionAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, role, totp_enabled FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as any;
    sendSuccess(res, user);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/2fa/setup', sessionAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as any;
    const secret = generateTotpSecret();
    await db.query('UPDATE users SET totp_enabling_secret = $1 WHERE id = $2', [secret, req.session.userId]);
    const qrCode = await generateTotpUri(secret, user.username);
    sendSuccess(res, { qrCode });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

const totpVerifyBody = z.object({
  token: z.string().regex(/^\d{6}$/, 'Enter a 6-digit code'),
});

router.post('/2fa/verify', sessionAuth, async (req, res) => {
  const parsed = totpVerifyBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input');

  try {
    const { token } = parsed.data;
    const result = await db.query('SELECT totp_enabling_secret FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as { totp_enabling_secret: string | null } | undefined;

    if (user?.totp_enabling_secret && verifyTotp(token, user.totp_enabling_secret)) {
      await db.query(
        'UPDATE users SET totp_secret = $1, totp_enabled = TRUE, totp_enabling_secret = NULL WHERE id = $2',
        [user.totp_enabling_secret, req.session.userId]
      );
      sendSuccess(res, { message: '2FA enabled' });
    } else {
      sendError(res, 'Invalid token');
    }
  } catch (err: any) {
    sendError(res, err.message);
  }
});

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

router.post('/change-password', sessionAuth, async (req, res) => {
  const parsed = changePasswordBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input');

  try {
    const { currentPassword, newPassword } = parsed.data;
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as { password_hash: string } | undefined;
    if (!user) return sendError(res, 'User not found', 404);

    if (await verifyPassword(currentPassword, user.password_hash)) {
      const newHash = await hashPassword(newPassword);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.session.userId]);
      sendSuccess(res, { message: 'Password updated' });
    } else {
      sendError(res, 'Incorrect current password');
    }
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
