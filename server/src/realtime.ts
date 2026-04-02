import type { Server as HttpServer } from 'http';
import type { RequestHandler } from 'express';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from './config/env';

type RealtimeAction = 'created' | 'updated' | 'deleted' | 'sync' | 'changed';

export type RealtimeEvent = {
  resource: string;
  action: RealtimeAction;
  at: string;
  actor_user_id?: number | null;
  id?: string | number;
  meta?: Record<string, unknown>;
};

const RESOURCE_SCOPES = new Set([
  'servers',
  'groups',
  'tags',
  'ips',
  'cloud-providers',
  'custom-columns',
  'ssh-keys',
  'users',
  'settings',
  'tokens',
  'export-import',
]);

let ioInstance: Server | null = null;

function parseBearerToken(socket: Socket): string | null {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth.trim();
  const header = socket.handshake.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

function getSessionUser(socket: Socket): { userId?: number; role?: string } {
  const req = socket.request as Socket['request'] & {
    session?: { userId?: number; role?: string };
    userId?: number;
  };
  return {
    userId: req.session?.userId ?? req.userId,
    role: req.session?.role,
  };
}

function checkAuthed(socket: Socket): boolean {
  const { userId } = getSessionUser(socket);
  const bearer = parseBearerToken(socket);
  return Boolean(userId || bearer);
}

export function initRealtime(server: HttpServer, sessionMiddleware: RequestHandler): Server {
  const io = new Server(server, {
    cors: { origin: env.corsAllowedOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.engine.use(sessionMiddleware as any);
  if (env.redisUrl) {
    const pub = createClient({ url: env.redisUrl });
    const sub = pub.duplicate();
    Promise.all([pub.connect(), sub.connect()])
      .then(() => {
        io.adapter(createAdapter(pub, sub));
        console.log('[realtime] Redis adapter enabled');
      })
      .catch((err) => {
        console.error('[realtime] Redis adapter disabled:', err);
      });
  }

  io.use((socket, next) => {
    if (!checkAuthed(socket)) return next(new Error('unauthorized'));
    return next();
  });

  io.on('connection', (socket) => {
    const { userId, role } = getSessionUser(socket);
    socket.join('auth');
    if (userId) socket.join(`user:${userId}`);
    if (role) socket.join(`role:${role}`);

    let eventsInWindow = 0;
    let windowStart = Date.now();

    socket.on('subscribe', (payload: { scopes?: string[] } | undefined) => {
      const now = Date.now();
      if (now - windowStart > 10_000) {
        windowStart = now;
        eventsInWindow = 0;
      }
      eventsInWindow += 1;
      if (eventsInWindow > 40) {
        socket.emit('realtime:error', { error: 'rate_limited' });
        return;
      }

      const scopes = payload?.scopes ?? [];
      for (const scope of scopes) {
        if (!RESOURCE_SCOPES.has(scope)) continue;
        socket.join(`scope:${scope}`);
      }
    });

    socket.on('unsubscribe', (payload: { scopes?: string[] } | undefined) => {
      const scopes = payload?.scopes ?? [];
      for (const scope of scopes) {
        if (!RESOURCE_SCOPES.has(scope)) continue;
        socket.leave(`scope:${scope}`);
      }
    });
  });

  ioInstance = io;
  return io;
}

export function emitRealtime(event: RealtimeEvent): void {
  if (!ioInstance) return;
  const payload: RealtimeEvent = {
    ...event,
    at: event.at || new Date().toISOString(),
  };
  const room = `scope:${event.resource}`;
  ioInstance.to(room).emit('realtime:event', payload);
  ioInstance.to('auth').emit('realtime:event', payload);
}

