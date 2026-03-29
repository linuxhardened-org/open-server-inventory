import { Router } from 'express';
import { z } from 'zod';
import db from '../db';
import { verifyPassword, hashPassword } from '../utils/crypto';
import { generateTotpSecret, generateTotpUri, verifyTotp } from '../utils/totp';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';

const router = Router();

router.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string(),
    password: z.string(),
    totpToken: z.string().optional()
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  try {
    const { username, password, totpToken } = parseResult.data;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0] as any;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return sendError(res, 'Invalid username or password', 401);
    }

    if (user.totp_enabled) {
      if (!totpToken || !verifyTotp(totpToken, user.totp_secret)) {
        return sendError(res, 'Invalid TOTP token', 401);
      }
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    sendSuccess(res, { id: user.id, username: user.username, role: user.role, totpEnabled: !!user.totp_enabled });
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
    sendSuccess(res, { secret, qrCode });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/2fa/verify', sessionAuth, async (req, res) => {
  try {
    const { token } = req.body;
    const result = await db.query('SELECT totp_enabling_secret FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as any;
    
    if (user.totp_enabling_secret && verifyTotp(token, user.totp_enabling_secret)) {
      await db.query('UPDATE users SET totp_secret = $1, totp_enabled = TRUE, totp_enabling_secret = NULL WHERE id = $2', [user.totp_enabling_secret, req.session.userId]);
      sendSuccess(res, { message: '2FA enabled' });
    } else {
      sendError(res, 'Invalid token');
    }
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/change-password', sessionAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as any;

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
