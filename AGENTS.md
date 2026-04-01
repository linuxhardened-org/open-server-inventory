# Repository Guidelines

## Project Structure & Module Organization
This repository is split into two TypeScript apps:

- `client/`: React 18 + Vite frontend. Main code lives in `client/src/`, with page-level screens in `pages/`, reusable UI in `components/`, shared helpers in `lib/`, and Zustand stores in `store/`.
- `server/`: Express backend. API routes live in `server/src/routes/`, auth and request guards in `middleware/`, database code in `db/`, and shared utilities in `utils/`.
- `docs/screenshots/`: UI screenshots used by the README.
- `scripts/`: browser automation for refreshing screenshots.

## Build, Test, and Development Commands
- `make install`: install frontend and backend dependencies.
- `make dev`: run Vite and the Express API together for local development.
- `make build`: build both apps (`client/dist` and `server/dist`).
- `make seed`: seed the PostgreSQL database with initial data.
- `make start`: start the full stack with Docker Compose.
- `cd client && npm run lint`: run the frontend ESLint check.
- `node scripts/playwright_capture_screenshots.mjs http://localhost:8080`: refresh README screenshots after UI changes.

## Coding Style & Naming Conventions
Use TypeScript throughout. Follow the existing style: 2-space indentation, semicolons, single quotes on the server, and descriptive PascalCase component files such as `ServerTable.tsx` and `IpInventory.tsx`. Keep React pages and components in PascalCase, hooks/helpers in camelCase, and backend route modules as plural resources such as `servers.ts` and `groups.ts`. Prefer small utility modules over large mixed-purpose files.

## Testing Guidelines
There is no committed unit-test suite yet. At minimum, verify changes with `make build`, run `cd client && npm run lint` for frontend edits, and smoke-test the affected workflow in `make dev` or Docker. If you add automated tests, keep them next to the feature or in a clearly named `__tests__` area and use `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes such as `feat:` and `fix:`. Keep commits focused and imperative, for example `fix: validate bearer token format`. Pull requests should describe the user-visible change, note any database or config impact, link related issues, and include updated screenshots for UI changes.

## Security & Configuration Tips
Copy `server/.env.example` to `server/.env` for local setup. Do not commit secrets, database credentials, or generated `.env` files. Report vulnerabilities through GitHub Security Advisories as described in `SECURITY.md`, not public issues.
