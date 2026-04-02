import dotenv from 'dotenv';
import { loadPersistedConfig } from '../utils/persistedConfig';

dotenv.config();

// Persisted config (written during setup) overrides env vars
const persisted = loadPersistedConfig();
if (persisted.database_url && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = persisted.database_url;
}

const isProduction = process.env.NODE_ENV === 'production';

function requireSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (isProduction) {
    if (!s || s.length < 32) {
      throw new Error(
        'SESSION_SECRET must be set to a random string of at least 32 characters when NODE_ENV=production'
      );
    }
    return s;
  }
  return s || 'servervault-dev-only-secret-not-for-production';
}

/** Set `COOKIE_SECURE=true` only when the app is served over HTTPS (reverse proxy TLS). */
const cookieSecure = process.env.COOKIE_SECURE === 'true';

const listenHostRaw = (process.env.HOST || '0.0.0.0').trim();
/** HTTP/WebSocket bind address (default all interfaces — needed for Docker and LAN access). */
const listenHost = listenHostRaw || '0.0.0.0';

/**
 * Browsers treat `localhost` and `127.0.0.1` as different origins. If CLIENT_URL only lists
 * one of them, login (cookies + CORS) fails when users open the app via the other hostname.
 */
function expandCorsOrigins(primary: string): string[] {
  const set = new Set<string>();
  const trimmed = primary.trim();
  if (trimmed) set.add(trimmed);
  try {
    const u = new URL(trimmed);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    if (u.hostname === 'localhost') {
      set.add(`${u.protocol}//127.0.0.1:${port}`);
    } else if (u.hostname === '127.0.0.1') {
      set.add(`${u.protocol}//localhost:${port}`);
    }
  } catch {
    /* ignore invalid CLIENT_URL */
  }
  return Array.from(set);
}

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

export const env = {
  isProduction,
  port: parseInt(process.env.PORT || '3001', 10),
  listenHost,
  clientUrl,
  /** Origins allowed for CORS + Socket.IO (includes localhost ↔ 127.0.0.1 mirror of clientUrl). */
  corsAllowedOrigins: expandCorsOrigins(clientUrl),
  sessionSecret: requireSessionSecret(),
  /** If false, session cookies work on plain HTTP (Docker/local). */
  cookieSecure,
  redisUrl: process.env.REDIS_URL || null,
  githubToken: process.env.GITHUB_TOKEN || null,
  /**
   * DATABASE_URL takes priority over individual POSTGRES_* vars.
   * Set this to your Supabase connection string (Session mode, port 5432).
   * Example: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   */
  databaseUrl: process.env.DATABASE_URL || null,
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DATABASE || 'servervault',
  },
};
