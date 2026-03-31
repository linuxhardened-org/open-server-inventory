import express from 'express';
import http from 'http';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import morgan from 'morgan';
import cron from 'node-cron';

import { env } from './config/env';
import authRoutes from './routes/auth';
import tokenRoutes from './routes/tokens';
import serverRoutes from './routes/servers';
import groupRoutes from './routes/groups';
import tagRoutes from './routes/tags';
import sshKeyRoutes from './routes/sshKeys';
import statsRoutes from './routes/stats';
import exportImportRoutes from './routes/exportImport';
import customColumnsRoutes from './routes/customColumns';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import cloudProvidersRoutes from './routes/cloudProviders';
import ipsRoutes from './routes/ips';

import { sessionAuth } from './middleware/sessionAuth';
import { bearerAuth } from './middleware/bearerAuth';

import db, { initDB } from './db';
import { attachClientSpa } from './spaStatic';
import { runAutoSync } from './utils/cloudSync';
import { emitRealtime, initRealtime } from './realtime';

const PgSession = connectPgSimple(session);

const app = express();
const PORT = env.port;
const httpServer = http.createServer(app);

app.use(morgan('dev'));
app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));

const sessionMiddleware = session({
  store: new PgSession({
    pool: db.pool,
    tableName: 'session'
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.cookieSecure,
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
});
app.use(sessionMiddleware);

// Mutation -> realtime invalidation bridge (keeps route handlers decoupled).
app.use((req, res, next) => {
  if (!req.originalUrl.startsWith('/api/')) return next();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const [pathNoQuery] = req.originalUrl.split('?');
    const parts = pathNoQuery.split('/').filter(Boolean); // ['api', 'servers', ':id']
    const resource = parts[1] ?? 'unknown';
    const targetId = parts[2];
    const action =
      req.method === 'POST'
        ? 'created'
        : req.method === 'DELETE'
          ? 'deleted'
          : 'updated';
    emitRealtime({
      resource,
      action,
      id: targetId,
      at: new Date().toISOString(),
      actor_user_id: req.session?.userId ?? req.userId ?? null,
      meta: { path: pathNoQuery, status: res.statusCode },
    });
  });

  next();
});

// Routes
app.use('/api/auth', authRoutes);

// Protected routes (Session or Bearer)
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.headers.authorization) {
    return bearerAuth(req, res, next);
  }
  return sessionAuth(req, res, next);
};

app.use('/api/tokens', sessionAuth, tokenRoutes);
app.use('/api/servers', authMiddleware, serverRoutes);
app.use('/api/custom-columns', authMiddleware, customColumnsRoutes);
app.use('/api/groups', authMiddleware, groupRoutes);
app.use('/api/tags', authMiddleware, tagRoutes);
app.use('/api/ssh-keys', authMiddleware, sshKeyRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/export-import', sessionAuth, exportImportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/cloud-providers', sessionAuth, cloudProvidersRoutes);
app.use('/api/ips', authMiddleware, ipsRoutes);

attachClientSpa(app);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Initialize Database before starting the server
initDB().then(() => {
  initRealtime(httpServer, sessionMiddleware);
  httpServer.listen(PORT, () => {
    console.log(`ServerVault Backend running on http://localhost:${PORT}`);
  });

  // Schedule cloud provider auto-sync - runs every hour, syncs providers scheduled for that hour
  cron.schedule('0 * * * *', runAutoSync);
  console.log('Cloud auto-sync scheduler running (checks every hour)');
}).catch(err => {
  console.error('Failed to start server due to database initialization error:', err);
  process.exit(1);
});
