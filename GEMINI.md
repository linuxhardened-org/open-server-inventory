# ServerVault — Project Instruction Context

This document provides foundational context and instructions for AI agents working in the ServerVault repository.

## Project Overview
**ServerVault** is an open-source, self-hosted server inventory management system for DevOps teams, sysadmins, and IT professionals. It allows teams to track physical servers, virtual machines, and cloud instances in a unified, modern dashboard.

- **Architecture:** Monolith-style deployment where an Express.js backend serves both a REST API and a React Single Page Application (SPA). In development, Vite proxies `/api/*` requests to Express.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand (state), Framer Motion (animations), Lucide React (icons), Geist Sans/Mono (fonts).
- **Backend:** Node.js (Express), TypeScript, PostgreSQL (raw SQL via `pg` driver, no ORM).
- **Realtime:** Socket.IO (WebSocket) for live inventory updates and cross-client consistency.
- **Database:** PostgreSQL stores inventory, user data, sessions, and audit logs. Schema is auto-created on server startup (`initDB()`).
- **Security:** Session-based auth for UI; Bearer Token auth for API. Supports TOTP-based 2FA via `speakeasy`.

## Project Structure & File Map
- `client/`: Frontend source (Vite + React).
- `server/`: Backend source (Express + TypeScript).
- `docs/`: Screenshots and documentation.
- `Makefile`: Root-level task runner.
- `docker-compose.yml`: Production orchestration.

### Feature Mapping (For AI Routing)
| Feature | Backend (server/src/...) | Frontend (client/src/...) |
| :--- | :--- | :--- |
| **Auth & 2FA** | `routes/auth.ts`, `utils/crypto.ts`, `utils/totp.ts` | `store/useAuthStore.ts`, `pages/Login.tsx` |
| **Inventory** | `routes/servers.ts`, `db/schema.ts` | `pages/Servers.tsx`, `components/ServerTable.tsx` |
| **IP Catalog** | `routes/ips.ts` | `pages/IpInventory.tsx` |
| **Groups/Tags** | `routes/groups.ts`, `routes/tags.ts` | `pages/Groups.tsx`, `pages/Tags.tsx` |
| **Custom Fields** | `routes/customColumns.ts` | `components/AddServerModal.tsx` |
| **Cloud Sync** | `utils/cloudSync.ts`, `utils/providers/` | `pages/CloudIntegrations.tsx` |
| **Realtime** | `realtime.ts` | `lib/realtime.ts`, `hooks/useRealtimeResource.ts` |
| **Styles/UI** | `spaStatic.ts` | `index.css`, `components/Layout.tsx`, `store/useThemeStore.ts` |
| **Settings** | `routes/settings.ts`, `routes/tokens.ts` | `pages/Settings.tsx`, `pages/ApiSettings.tsx` |

## Building and Running

### Mandatory Rule
**CRITICAL:** This project requires a full container rebuild after every `git pull`. Always run `docker-compose down && docker-compose up --build -d` to apply changes.

### Automation Tool
A script `./sync-and-rebuild.sh` is available to automate the following steps:
1. `git fetch upstream`
2. `git merge upstream/main`
3. `git push origin main`
4. `docker-compose down && docker-compose up --build -d`

Usage:
```bash
./sync-and-rebuild.sh
```

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Docker)

### Setup & Development
1. **Install Dependencies:**
   ```bash
   make install
   ```
2. **Configure Environment:**
   Create `server/.env` (see `server/.env.example` for reference).
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
3. **Seed Database:**
   ```bash
   make seed
   ```
4. **Run Development Mode:**
   ```bash
   make dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`

### Default Login
- **Username:** `Admin`
- **Password:** `Admin@123`
- *Note: Password change is required on first login.*

### Production & Docker
```bash
make build   # Build client/dist and server/dist
make start   # docker-compose up --build (serves on :8080)
```

## Development Conventions

### Backend (Express)
- **Routing:** 10 core routes: auth, servers, groups, tags, ssh-keys, tokens, custom-columns, users, stats, export-import.
- **Validation:** Use **Zod** for request body/query validation within route handlers.
- **Auth:**
  - `sessionAuth`: Browser-based (express-session with `connect-pg-simple`, 24h TTL).
  - `bearerAuth`: API-based (SHA-256 hashed tokens in `api_tokens` table, `Authorization: Bearer sv_xxx`).
  - `authMiddleware`: Combined middleware (checks bearer first, then session).
- **Response Format:** Always `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

### Frontend (React)
- **Routing:** React Router v6 (routes defined in `App.tsx`).
- **State:** Zustand stores in `client/src/store/` (`useAuthStore`, `useServerStore`, `useThemeStore`).
- **API Client:** Axios in `client/src/lib/api.ts` with `baseURL: /api` and `withCredentials: true`.
- **Types:** Shared TypeScript interfaces in `client/src/types/index.ts`.

### Database Schema
- **Key Tables:** `servers`, `server_disks`, `server_interfaces`, `server_tags`, `server_custom_values`, `server_history`.
- **Custom Columns:** Dynamic metadata via `custom_columns` + `server_custom_values` (normalized).
- **Audit Logging:** Every mutation records an entry in `server_history` (append-only).
- **Atomic Operations:** Use PostgreSQL transactions for operations affecting multiple tables.

## Special Features
- **Linode Cloud Sync:** Captures primary/additional IPs, VPC private IPs, NAT 1:1 public mappings, and VPC subnet metadata.
- **Cloud Token Auditor:** Scans API tokens for overpermissioned scopes.
- **Export/Import:** JSON-based full backup/restore (admin only).

## Efficiency & Optimization
- **Shell:** Use bash for all tasks.
- **Code Edits:** Use surgical replacements; show only changed parts.
- **Brevity:** Keep responses under 120 words.
- **Troubleshooting:** Return: Cause, Fix, Verify.
- **Output:** Prefer code blocks and bullets over prose.
