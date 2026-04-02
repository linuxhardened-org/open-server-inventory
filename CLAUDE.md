# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ServerVault** — a self-hosted server inventory management app. React SPA frontend served by an Express backend, backed by PostgreSQL. Single Docker Compose deployment.

## Commands

### Development
```bash
make install        # npm install in both client/ and server/
make dev            # Run Vite (:5173) + Express (:3001) in parallel
make seed           # Seed database with initial data
```

### Build & Deploy
```bash
make build          # Compile TypeScript (server) + Vite (client)
make start          # docker-compose up --build
```

### Docker (remote server: 142.44.210.103)
```bash
# Pull, rebuild, restart
git -C /home/rushikesh.sakharle/projects/open-server-inventory-1 pull
docker compose -f /home/rushikesh.sakharle/projects/open-server-inventory-1/docker-compose.yml up --build -d

# Push to DockerHub (linuxhardened/open-server-inventory:latest)
docker tag open-server-inventory-1-server:latest linuxhardened/open-server-inventory:latest
docker push linuxhardened/open-server-inventory:latest
```

**Important:** The postgres volume does NOT auto-create the `servervault` database. On a fresh volume, run:
```bash
docker exec servervault-db psql -U postgres -c 'CREATE DATABASE servervault;'
docker compose restart server
```

### Per-directory dev
```bash
cd server && npm run dev    # ts-node-dev with auto-reload on :3001
cd client && npm run dev    # Vite dev server on :5173
```

### No test suite exists in this project.

## Environment Setup

Create `server/.env`:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DATABASE=servervault
SESSION_SECRET=your-32-char-minimum-random-secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
COOKIE_SECURE=false
# Optional: takes priority over individual POSTGRES_* vars
# DATABASE_URL=postgresql://user:pass@host:5432/db
# Optional: enables Redis adapter for Socket.IO (multi-instance deployments)
# REDIS_URL=redis://localhost:6379
```

Database schema is auto-created on server startup via `initDB()` in `server/src/db/schema.ts`. Additive schema changes (new columns, tables) are handled by `server/src/db/migrations.ts`, which runs automatically on startup after `initDB()`.

## Architecture

### Production Build Flow
The Docker multi-stage build: builds the client (Vite output → `client/dist/`), builds the server (TypeScript → `server/dist/`), copies the Vite output into `server/client-dist/`, then Express serves both the API and the SPA from a single process on port 3000. The SPA fallback is in `server/src/spaStatic.ts`.

In development, Vite proxies `/api/*` requests to Express on `:3001` (configured in `client/vite.config.ts`).

### Backend (`server/src/`)
- **Entry:** `index.ts` — Express app, middleware setup, route registration, calls `initDB()`
- **Routes:** `routes/` — auth, servers, groups, tags, ssh-keys, tokens, custom-columns, users, stats, export-import, settings, cloud-providers, ips
- **Auth middleware:** `middleware/` — `authMiddleware` (session OR bearer token), `sessionAuth` (session only), `adminAuth` (admin role required)
- **Validation:** Zod schemas inline in every route handler
- **DB:** `pg` driver with raw SQL, no ORM. Schema in `db/schema.ts`, migrations in `db/migrations.ts`
- **API response shape:** always `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- **CSRF:** Custom header check — all mutating API requests (POST/PUT/PATCH/DELETE) must include `X-Requested-With: XMLHttpRequest` unless using Bearer token auth. The Axios instance in `lib/api.ts` sets this header automatically.

### Frontend (`client/src/`)
- **Routing:** React Router v6 — routes defined in `App.tsx`
- **State:** Zustand stores in `store/` — `useAuthStore`, `useServerStore`, `useThemeStore`, `useSettingsStore`
- **API calls:** Axios instance in `lib/api.ts` with `baseURL: /api` and `withCredentials: true`
- **Types:** Shared TypeScript interfaces in `types/index.ts`
- **Realtime:** `lib/realtime.ts` wraps Socket.IO client. Components subscribe to resource scopes via `subscribeScope`/`unsubscribeScope`; the `useRealtimeResource` hook manages this lifecycle automatically.

### Authentication
Two auth modes coexist:
1. **Session** (browser UI) — PostgreSQL-backed express-session, 24h TTL, httpOnly cookies
2. **Bearer token** (API/automation) — SHA-256 hashed tokens stored in `api_tokens` table, sent as `Authorization: Bearer sv_xxx`

TOTP 2FA uses `speakeasy`. A temporary secret (`totp_enabling_secret`) is stored during setup and moved to `totp_secret` on verification.

First-run setup is gated by `GET /api/auth/setup-status` returning `{ isSetupCompleted: false }`. The app redirects to `/setup` until an admin account is created.

### Realtime (Socket.IO)
Server: `server/src/realtime.ts` — Socket.IO server attached to the HTTP server. Every successful mutating API response automatically emits a `realtime:event` via a response-finish middleware in `index.ts` (no manual emit needed in route handlers).

Client: `client/src/lib/realtime.ts` — singleton Socket.IO client. Events are deduplicated by `(resource:action:id:timestamp)` and out-of-order events are suppressed per entity. Components use `useRealtimeResource` hook or `onRealtimeEvent` directly.

Optional Redis adapter: set `REDIS_URL` to enable multi-instance pub/sub. Falls back to in-memory if Redis is unavailable.

### Cloud Provider Sync
Supported providers: Linode, DigitalOcean, OVH (CA/US/EU), AWS, GCP, Vultr. Provider sync functions live in `server/src/utils/providers/` and are registered in `server/src/utils/cloudSync.ts` via `registerProvider()`.

- **OVH** (`ovh.ts`): single file for all 3 endpoints (CA/US/EU), each just calls `syncOvhProviderByBaseUrl` with a different base URL. Fetches Cloud instances, VPS (OS from `/vps/{name}/distribution`), and Dedicated servers in parallel.
- **AWS** (`aws.ts`): credentials stored as JSON `{accessKeyId, secretAccessKey}`. Auto-discovers all enabled regions via `DescribeRegions`, fetches instances from all in parallel with `Promise.allSettled`.
- **GCP** (`gcp.ts`): credentials = service account JSON stored as `api_token`. Auth via `google-auth-library` JWT. Uses `aggregated/instances` API to get all zones in one call.
- **Vultr** (`vultr.ts`): plain API key, cursor-based pagination on `/v2/instances`.

Auto-sync runs every 5 minutes via `node-cron`, but each provider syncs at its own configurable interval (default 60 min). Delta detection via SHA-256 hash of instance IDs+statuses skips DB writes when nothing changed. Synced servers are upserted by `cloud_instance_id` and grouped under an auto-created group named after the provider.

**Note:** `cloud-providers` route uses `sessionAuth` only — Bearer tokens cannot access it. All other data routes support Bearer tokens.

### Database Schema (key tables)
- `servers` — core inventory; related `server_disks`, `server_interfaces`, `server_tags`, `server_custom_values`, `server_history`, `server_ips`
- `cloud_providers` — registered cloud accounts; `servers.cloud_provider_id` + `cloud_instance_id` link synced servers back to their provider
- `custom_columns` + `server_custom_values` — user-defined fields per server (normalized)
- `api_tokens` — hashed bearer tokens with last-used tracking
- `app_settings` — key/value table for global settings (e.g. `app_name`)
- `session` — express-session store (connect-pg-simple)

Mutations to servers use **PostgreSQL transactions** to atomically update custom values, tags, and history.

### Key Design Decisions
- Custom columns are fully dynamic — no schema changes needed, values stored in `server_custom_values`
- API tokens store only the SHA-256 hash; plaintext is shown once at creation
- Server history (`server_history`) is append-only audit log — never mutated
- Export/import is JSON-based; full backup (admin only) includes SSH keys and tokens
- Schema additions use additive-only migrations (`ADD COLUMN IF NOT EXISTS`) — never drops or renames existing columns
- Cloud provider credentials for multi-field providers (OVH, AWS, GCP) are stored as JSON in the `api_token` column; single-key providers (Linode, DO, Vultr) store plaintext

### Go SDK
A boto3-style Go SDK lives in `sdk/go/`. Entry point: `New(baseURL, token)` or `NewFromEnv()` (reads `SERVERVAULT_BASE_URL` + `SERVERVAULT_TOKEN`). Service objects: `sv.Servers`, `sv.Groups`, `sv.Tags`, `sv.SSHKeys`, `sv.IPs`, `sv.Tokens`, `sv.Stats`. Stdlib only, no external deps.
