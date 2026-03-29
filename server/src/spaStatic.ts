import path from 'path';
import fs from 'fs';
import express, { type Express } from 'express';

/**
 * Resolve the Vite production output directory.
 * Prefer CLIENT_DIST, then a path next to the compiled server (`dist/../client-dist`),
 * then `client-dist` under `process.cwd()` (works when started from app root only).
 */
function resolveClientDist(): string | null {
  const envPath = process.env.CLIENT_DIST?.trim();
  if (envPath) {
    const resolved = path.resolve(envPath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  const nextToCompiled = path.resolve(__dirname, '..', 'client-dist');
  if (fs.existsSync(nextToCompiled)) {
    return nextToCompiled;
  }

  const nextToCwd = path.resolve(process.cwd(), 'client-dist');
  if (fs.existsSync(nextToCwd)) {
    return nextToCwd;
  }

  return null;
}

/** Serves Vite `dist` from `client-dist/` when present (Docker / unified deploy). */
export function attachClientSpa(app: Express): void {
  const clientDist = resolveClientDist();
  if (!clientDist) {
    return;
  }

  const indexHtml = path.resolve(clientDist, 'index.html');

  app.use(express.static(clientDist, { index: ['index.html'] }));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      if (req.method === 'OPTIONS') {
        return next();
      }
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
}
