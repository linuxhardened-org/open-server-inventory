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

  // Hashed assets (JS/CSS) — cache aggressively, they never change at the same URL
  app.use('/assets', express.static(path.join(clientDist, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));

  // Everything else (images, fonts, favicon) — short cache
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));

  app.use((req, res, next) => {
    // Only catch actual API routes (/api/...), not client routes like /api-settings
    if (req.path.startsWith('/api/') || req.path === '/api') {
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
    // index.html must never be cached — it references hashed JS/CSS bundles
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
}
