# ServerVault — Server Inventory Manager

ServerVault is a local, self-hosted server inventory manager focused on security, portability, and ease of use. It includes a light/dark UI, multi-factor authentication (2FA), custom inventory columns, and a Bearer Token API for integrations (n8n, CI/CD, scripts).

## Quick start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker)
- Docker & Docker Compose (optional)
- Make (optional)

### Setup and installation

1. **Clone and install dependencies**

   ```bash
   make install
   ```

2. **Environment variables**

   Create a `.env` file in the `server` directory (see `server` for supported keys):

   ```env
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DATABASE=servervault
   SESSION_SECRET=your-long-random-secret-at-least-32-chars
   ```

   In production (`NODE_ENV=production`), `SESSION_SECRET` is **required** and must be at least 32 characters.

   Optional: `CLIENT_URL` — browser origin used for CORS and session cookies (default `http://localhost:5173` in development). Match this to the URL you use to open the UI.

3. **Initialize the database**

   ```bash
   make seed
   ```

4. **Development mode**

   ```bash
   make dev
   ```

   Runs the Vite client and the API in parallel:

   - **Frontend:** `http://localhost:5173` (default Vite port)
   - **Backend:** `http://localhost:3001` (or the port in `PORT`; default is `3001`)

   The Vite dev server proxies **`/api`** to the Express app on port **3001** (see `client/vite.config.ts`), so the browser can use relative `/api` URLs while developing.

### Docker

Build and start Postgres and a single **Node/Express** process that serves both the **REST API** and the **built SPA** (Vite output is copied into the image as `client-dist/`).

```bash
docker compose up --build
```

Or with Make:

```bash
make start
```

**Published ports**

| Service    | Host port | Notes |
| ---------- | --------- | ----- |
| App (UI + API) | **3001** | Express: static files + SPA fallback + `/api/*` |
| PostgreSQL | **5432** | Database |

Open the app at **`http://localhost:3001`**. Same origin for UI and API (no reverse proxy required). `docker-compose.yml` sets `CLIENT_URL=http://localhost:3001` for CORS and cookies; change it if you publish on another host or port.

For production, set `SESSION_SECRET` and other secrets via environment variables or secrets management; do not rely on the example values in `docker-compose.yml`.

## Authentication

### First login

Use the **Login** page with a real database user so the browser gets a **session cookie** (`POST /api/auth/login`). Client-side-only “dummy” login is not used. Default seed credentials (change in production):

- **Username:** `admin`
- **Password:** `password123`

Without this session, admin API routes (for example **Users**) respond with 401/403.

### 2FA

1. Open **Profile**.
2. Choose **Enable 2FA**.
3. Scan the QR code with an authenticator app.
4. Enter the 6-digit code to confirm.

### API bearer tokens

Create tokens under **Profile** for programmatic access.

```bash
curl -H "Authorization: Bearer sv_your_token_here" http://localhost:3001/api/servers
```

Tokens are shown once at creation; only a SHA-256 hash is stored server-side.

## Features

- **Dashboard** — Overview charts (theme-aware in light and dark mode).
- **Servers** — Inventory list with detail drawer; **custom columns** (add named fields, values per server, export/import aware).
- **Organization** — Groups, tags, and SSH key metadata.
- **Users & settings** — Role-based access; application settings.
- **Data portability** — Export/import inventory as JSON (private SSH keys omitted by default; admin-only import; optional full backup flags as documented in the API).
- **Routing** — Single-page app; in production, Express serves `index.html` for non-file routes so **direct links and refresh** on paths such as `/servers` work.

## n8n integration

1. Create a **Header Auth** credential with name `Authorization` and value `Bearer <your-token>`.
2. Use an **HTTP Request** node against `http://<your-host>:3001/api/...` (or your public API URL).

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React, Zustand, React Router.
- **Backend:** Express.js, TypeScript, PostgreSQL (`pg`), express-session (PostgreSQL store), Zod.

## License

See the repository license file if present.
