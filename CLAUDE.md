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
```

Database schema is auto-created on server startup via `initDB()` in `server/src/db/schema.ts`.

## Architecture

### Production Build Flow
The Docker multi-stage build: builds the client (Vite output → `client/dist/`), builds the server (TypeScript → `server/dist/`), copies the Vite output into `server/client-dist/`, then Express serves both the API and the SPA from a single process on port 3000. The SPA fallback is in `server/src/spaStatic.ts`.

In development, Vite proxies `/api/*` requests to Express on `:3001` (configured in `client/vite.config.ts`).

### Backend (`server/src/`)
- **Entry:** `index.ts` — Express app, middleware setup, route registration, calls `initDB()`
- **Routes:** `routes/` — 10 files: auth, servers, groups, tags, ssh-keys, tokens, custom-columns, users, stats, export-import
- **Auth middleware:** `middleware/` — `authMiddleware` (session OR bearer token), `sessionAuth` (session only), `adminAuth` (admin role required)
- **Validation:** Zod schemas inline in every route handler
- **DB:** `pg` driver with raw SQL, no ORM. Schema and queries in `db/`
- **API response shape:** always `{ success: true, data: ... }` or `{ success: false, error: "..." }`

### Frontend (`client/src/`)
- **Routing:** React Router v6 — routes defined in `App.tsx`
- **State:** Zustand stores in `store/` — `useAuthStore`, `useServerStore`, `useThemeStore`
- **API calls:** Axios instance in `lib/api.ts` with `baseURL: /api` and `withCredentials: true`
- **Types:** Shared TypeScript interfaces in `types/index.ts`

### Authentication
Two auth modes coexist:
1. **Session** (browser UI) — PostgreSQL-backed express-session, 24h TTL, httpOnly cookies
2. **Bearer token** (API/automation) — SHA-256 hashed tokens stored in `api_tokens` table, sent as `Authorization: Bearer sv_xxx`

TOTP 2FA uses `speakeasy`. A temporary secret (`totp_enabling_secret`) is stored during setup and moved to `totp_secret` on verification.

### Database Schema (key tables)
- `servers` — core inventory; related `server_disks`, `server_interfaces`, `server_tags`, `server_custom_values`, `server_history`
- `custom_columns` + `server_custom_values` — user-defined fields per server (normalized)
- `api_tokens` — hashed bearer tokens with last-used tracking
- `session` — express-session store (connect-pg-simple)

Mutations to servers use **PostgreSQL transactions** to atomically update custom values, tags, and history.

### Key Design Decisions
- Custom columns are fully dynamic — no schema changes needed, values stored in `server_custom_values`
- API tokens store only the SHA-256 hash; plaintext is shown once at creation
- Server history (`server_history`) is append-only audit log — never mutated
- Export/import is JSON-based; full backup (admin only) includes SSH keys and tokens
