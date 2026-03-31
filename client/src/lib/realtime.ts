import { io, Socket } from 'socket.io-client';

export type RealtimeEvent = {
  resource: string;
  action: 'created' | 'updated' | 'deleted' | 'sync' | 'changed';
  at: string;
  actor_user_id?: number | null;
  id?: string | number;
  meta?: Record<string, unknown>;
};

type Listener = (event: RealtimeEvent) => void;

const scopeRefs = new Map<string, number>();
const listeners = new Set<Listener>();
const seenEvents = new Map<string, number>();
const newestByEntity = new Map<string, number>();

let socket: Socket | null = null;

function getSocket(): Socket {
  if (socket) return socket;
  socket = io('/', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
  });

  socket.on('connect', () => {
    const scopes = [...scopeRefs.keys()];
    if (scopes.length > 0) socket?.emit('subscribe', { scopes });
  });

  socket.on('realtime:event', (event: RealtimeEvent) => {
    const eventTs = Date.parse(event.at || '') || Date.now();
    const dedupeKey = `${event.resource}:${event.action}:${String(event.id ?? '')}:${event.at}`;
    const entityKey = `${event.resource}:${String(event.id ?? '*')}`;

    if (seenEvents.has(dedupeKey)) return;
    seenEvents.set(dedupeKey, eventTs);
    if (seenEvents.size > 2000) {
      const now = Date.now();
      for (const [k, ts] of seenEvents) {
        if (now - ts > 60_000) seenEvents.delete(k);
      }
    }

    const lastTs = newestByEntity.get(entityKey);
    if (typeof lastTs === 'number' && eventTs < lastTs) return;
    newestByEntity.set(entityKey, eventTs);

    for (const cb of listeners) cb(event);
  });

  socket.on('realtime:error', (err) => {
    // Hook for centralized logging/monitoring
    console.warn('[realtime]', err);
  });

  return socket;
}

export function connectRealtime(): void {
  getSocket().connect();
}

export function disconnectRealtime(): void {
  if (!socket) return;
  socket.disconnect();
}

export function subscribeScope(scope: string): void {
  const next = (scopeRefs.get(scope) ?? 0) + 1;
  scopeRefs.set(scope, next);
  getSocket().emit('subscribe', { scopes: [scope] });
}

export function unsubscribeScope(scope: string): void {
  const cur = scopeRefs.get(scope);
  if (!cur) return;
  if (cur <= 1) {
    scopeRefs.delete(scope);
    socket?.emit('unsubscribe', { scopes: [scope] });
    return;
  }
  scopeRefs.set(scope, cur - 1);
}

export function onRealtimeEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

