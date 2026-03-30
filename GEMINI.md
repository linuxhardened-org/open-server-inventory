# ServerVault — Project Instruction Context

This document provides foundational context and instructions for AI agents working in the ServerVault repository.

## Project Overview
**ServerVault** is an open-source, self-hosted server inventory management system. It allows teams to track physical servers, virtual machines, and cloud instances in a unified dashboard.

- **Architecture:** Monolith-style deployment where an Express.js backend serves both a REST API and a React Single Page Application (SPA).
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand (state), Framer Motion (animations).
- **Backend:** Node.js (Express), TypeScript, PostgreSQL (raw SQL via `pg` driver, no ORM).
- **Database:** PostgreSQL stores inventory, user data, sessions, and audit logs. Schema is defined in `server/src/db/schema.ts` and initialized on startup.
- **Security:** Session-based auth for the UI; Bearer Token auth for API automation. Supports TOTP-based 2FA.

## Project Structure
- `client/`: Frontend source (Vite + React).
- `server/`: Backend source (Express + TypeScript).
- `docs/`: Screenshots and documentation.
- `Makefile`: Root-level task runner for development and builds.
- `docker-compose.yml`: Container orchestration for production and local testing.

## Building and Running

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

### Production Build
```bash
make build
# This builds client/dist/ and server/dist/, then serves both from the server.
```

## Development Conventions

### Backend (Express)
- **Routing:** Each resource has its own file in `server/src/routes/`.
- **Validation:** Use **Zod** for request body/query validation within route handlers.
- **Database:** Use raw SQL queries with the `pg` pool. SQL strings should be kept clean and parameterized.
- **Auth:**
  - `sessionAuth`: Middleware for browser-based session access.
  - `bearerAuth`: Middleware for API token access.
  - `authMiddleware`: Combined middleware (checks Authorization header first, then session).
- **Response Format:**
  - Success: `{ success: true, data: ... }`
  - Error: `{ success: false, error: "Error message" }`

### Frontend (React)
- **State Management:** Use **Zustand** stores in `client/src/store/`.
- **Styling:** Use **Tailwind CSS**. Prefer the "Obsidian-inspired" dark/terminal aesthetic.
- **API Client:** Use the pre-configured Axios instance in `client/src/lib/api.ts`.
- **Icons:** Use **Lucide React**.

### Database Schema
- **Dynamic Metadata:** Instead of adding columns to the `servers` table, use `custom_columns` and `server_custom_values` for user-defined metadata.
- **Audit Logging:** Every mutation to a server should record an entry in `server_history`.
- **Atomic Operations:** Use PostgreSQL transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) for operations affecting multiple tables (e.g., creating a server with tags and custom values).

## Testing
- **Current Status:** No automated test suite exists.
- **Manual Verification:** Verify API changes using `curl` or by testing through the local UI.
- **TODO:** Implement unit tests for backend utility functions (e.g., `totp.ts`, `crypto.ts`).
