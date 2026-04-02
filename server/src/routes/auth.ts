import { Router } from 'express';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import { z } from 'zod';
import db, { seedDefaultAdmin } from '../db';
import { verifyPassword, hashPassword } from '../utils/crypto';
import { generateTotpSecret, generateTotpUri, verifyTotp } from '../utils/totp';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';
import { savePersistedConfig } from '../utils/persistedConfig';

const router = Router();
const execAsync = promisify(exec);

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totpToken: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

const setupSchema = z.object({
  app_name: z.string().trim().min(1).max(80).optional(),
  database_url: z.string().url().optional(),
});

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function canReachLocalDb(): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function ensureDockerLocalDb(): Promise<void> {
  // Project root where docker-compose.yml lives
  const projectRoot = path.resolve(process.cwd(), '..');
  // Optional: set SV_SETUP_DOCKER_SUDO=1 to prefix with sudo -n
  const useSudo = process.env.SV_SETUP_DOCKER_SUDO === '1';
  const prefix = useSudo ? 'sudo -n ' : '';
  const cmd = `${prefix}docker compose up -d --build db`;
  await execAsync(cmd, { cwd: projectRoot, timeout: 120000, maxBuffer: 1024 * 1024 });
}

// POST /api/auth/prepare-local-db — verify/prepare local DB for setup wizard
router.post('/prepare-local-db', async (_req, res) => {
  try {
    // If local DB isn't reachable, try to start/build dockerized postgres first.
    if (!(await canReachLocalDb())) {
      try {
        await ensureDockerLocalDb();
      } catch (err: any) {
        return sendSuccess(res, {
          ready: false,
          error: `Local DB is unreachable and Docker start failed: ${err?.message || 'unknown error'}`,
        });
      }

      // Wait for DB to become reachable
      let up = false;
      for (let i = 0; i < 15; i++) {
        if (await canReachLocalDb()) {
          up = true;
          break;
        }
        await sleep(1000);
      }
      if (!up) {
        return sendSuccess(res, {
          ready: false,
          error: 'PostgreSQL container started, but DB is still not reachable',
        });
      }
    }

    // Ensure local DB schema/migrations are ready before final setup submit.
    const { schema } = await import('../db/schema');
    const { runMigrations } = await import('../db/migrations');
    await db.pool.query(schema);
    await runMigrations(db.pool);
    const versionR = await db.query('SELECT version() AS version');
    const version = ((versionR.rows[0] as { version?: string } | undefined)?.version ?? '').trim();
    sendSuccess(res, { ready: true, version: version ? version.split(' ').slice(0, 2).join(' ') : undefined });
  } catch (err: any) {
    // Keep 200-style payload so wizard can show inline retry state.
    sendSuccess(res, { ready: false, error: err.message || 'Could not initialize local database' });
  }
});

// POST /api/auth/test-db — test a DATABASE_URL before committing during setup
router.post('/test-db', async (req, res) => {
  const parsed = z.object({ database_url: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'database_url is required', 400);

  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: parsed.data.database_url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    const result = await pool.query('SELECT version() AS version');
    const version = (result.rows[0] as { version: string }).version;
    sendSuccess(res, {
      connected: true,
      version: version.split(' ').slice(0, 2).join(' '),
    });
  } catch (err: any) {
    sendSuccess(res, { connected: false, error: err.message });
  } finally {
    await pool.end().catch(() => {});
  }
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

    const { app_name, database_url } = parsed.data;

    // If a custom DATABASE_URL was provided, init schema on that DB and save config.
    // The server will restart (Docker restart: always) to use the new connection.
    let targetDb = db;
    let requiresRestart = false;

    if (database_url) {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: database_url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      try {
        const { schema } = await import('../db/schema');
        const { runMigrations } = await import('../db/migrations');
        await pool.query(schema);
        await runMigrations(pool);
        // Seed admin on the external DB before restart
        await seedDefaultAdmin(pool);
        targetDb = {
          query: (text: string, params?: any[]) => pool.query(text, params),
          pool,
        } as typeof db;
        savePersistedConfig({ database_url });
        requiresRestart = true;
      } catch (err: any) {
        await pool.end().catch(() => {});
        return sendError(res, `Database connection failed: ${err.message}`, 400);
      }
    }

    if (app_name) {
      await targetDb.query(
        'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        ['app_name', app_name]
      );
    }

    if (!database_url) {
      // Local DB: seed default admin now
      await seedDefaultAdmin(targetDb.pool);
    }

    if (requiresRestart) {
      // Config saved — restart server so the new DATABASE_URL pool is used from the start
      sendSuccess(res, { requiresRestart: true }, 201);
      setTimeout(() => process.exit(0), 400);
      return;
    }

    sendSuccess(res, { requiresRestart: false }, 201);
  } catch (err: any) {
    if (err?.code === '23505') return sendError(res, 'Username already exists', 409);
    sendError(res, err.message || 'Setup failed');
  }
});

router.get('/setup-status', async (_req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS count FROM users');
    const count = (result.rows[0] as { count: number }).count;
    const nameResult = await db.query(`SELECT value FROM app_settings WHERE key = 'app_name'`);
    const row = nameResult.rows[0] as { value: string } | undefined;
    const app_name = row?.value?.trim() || 'ServerVault';
    sendSuccess(res, { isSetupCompleted: count > 0, app_name });
  } catch (err: any) {
    sendError(res, err.message || 'Could not check setup status', 500);
  }
});

router.post('/login', async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) return sendError(res, 'Invalid input');

  try {
    const { username, password, totpToken, rememberMe } = parseResult.data;
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0] as {
      id: number;
      username: string;
      real_name: string | null;
      profile_picture_url: string | null;
      role: string;
      password_hash: string;
      totp_enabled: boolean;
      totp_secret: string | null;
      password_change_required: boolean;
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

      // If "remember me", extend session to 30 days instead of default 24h
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      }

      sendSuccess(res, {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        profilePictureUrl: user.profile_picture_url,
        role: user.role,
        totpEnabled: !!user.totp_enabled,
        passwordChangeRequired: !!user.password_change_required,
      });
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// PUT /api/auth/change-password — force-change flow + voluntary change
router.put('/change-password', sessionAuth, async (req, res) => {
  const schema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'new_password must be at least 8 characters', 400);

  const { current_password, new_password } = parsed.data;

  try {
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as { password_hash: string } | undefined;
    if (!user) return sendError(res, 'User not found', 404);

    if (!(await verifyPassword(current_password, user.password_hash))) {
      return sendError(res, 'Current password is incorrect', 401);
    }

    if (await verifyPassword(new_password, user.password_hash)) {
      return sendError(res, 'New password must be different from the current password', 400);
    }

    const newHash = await hashPassword(new_password);
    await db.query(
      'UPDATE users SET password_hash = $1, password_change_required = FALSE WHERE id = $2',
      [newHash, req.session.userId]
    );
    sendSuccess(res, { message: 'Password updated' });
  } catch (err: any) {
    sendError(res, err.message || 'Failed to change password');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    sendSuccess(res, { message: 'Logged out' });
  });
});

router.get('/me', sessionAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, real_name, profile_picture_url, role, totp_enabled, created_at FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0] as any;
    sendSuccess(res, user);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

// PATCH /api/auth/profile — update own profile (real_name)
router.patch('/profile', sessionAuth, async (req, res) => {
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
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid input', 400);

  const { real_name, profile_picture_url } = parsed.data;
  try {
    const result = await db.query(
      'UPDATE users SET real_name = $1, profile_picture_url = $2 WHERE id = $3 RETURNING id, username, real_name, profile_picture_url, role, totp_enabled, created_at',
      [real_name ?? null, profile_picture_url ?? null, req.session.userId]
    );
    if (result.rowCount && result.rowCount > 0) {
      sendSuccess(res, result.rows[0]);
    } else {
      sendError(res, 'User not found', 404);
    }
  } catch (err: any) {
    sendError(res, err.message || 'Failed to update profile');
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
