import dotenv from 'dotenv';

dotenv.config();

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

export const env = {
  isProduction,
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  sessionSecret: requireSessionSecret(),
  /** If false, session cookies work on plain HTTP (Docker/local). */
  cookieSecure,
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
