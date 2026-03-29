import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import morgan from 'morgan';

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

import { sessionAuth } from './middleware/sessionAuth';
import { bearerAuth } from './middleware/bearerAuth';

import db, { initDB } from './db';
import { attachClientSpa } from './spaStatic';

const PgSession = connectPgSimple(session);

const app = express();
const PORT = env.port;

app.use(morgan('dev'));
app.use(cors({
  origin: env.clientUrl,
  credentials: true
}));
app.use(express.json());

app.use(session({
  store: new PgSession({
    pool: db.pool,
    tableName: 'session'
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.isProduction,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

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

attachClientSpa(app);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Initialize Database before starting the server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`ServerVault Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server due to database initialization error:', err);
  process.exit(1);
});
