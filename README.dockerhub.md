# open-server-inventory

Open source, self-hosted server inventory management for DevOps teams and sysadmins.

## Quick Start

Run open-server-inventory with Docker Compose:

```yaml
services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: servervault
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d servervault"]
      interval: 5s
      timeout: 5s
      retries: 10

  servervault:
    image: linuxhardened/open-server-inventory:latest
    restart: always
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8080:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      CLIENT_URL: http://localhost:8080
      SESSION_SECRET: change-me-to-a-random-32-char-string-minimum
      POSTGRES_HOST: db
      POSTGRES_PORT: 5432
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DATABASE: servervault
    volumes:
      - server-data:/app/data

volumes:
  postgres-data:
  server-data:
```

Start it:

```bash
docker compose up -d
```

Open `http://localhost:8080`.

Default login:

- Username: `Admin`
- Password: `Admin@123`

You will be prompted to change the password on first login.

## Features

- Track physical servers, VMs, and cloud instances in one inventory
- Organize infrastructure with groups, tags, SSH key metadata, and custom columns
- Use session auth or bearer tokens for API-driven automation
- Get realtime updates with Socket.IO-backed sync
- Enable TOTP 2FA and role-based access control

## Screenshots

![Login](https://raw.githubusercontent.com/linuxhardened-org/open-server-inventory/main/docs/screenshots/login_fresh.png)

![Servers](https://raw.githubusercontent.com/linuxhardened-org/open-server-inventory/main/docs/screenshots/servers.png)

![Server Detail](https://raw.githubusercontent.com/linuxhardened-org/open-server-inventory/main/docs/screenshots/server_detail.png)

## Configuration

For external PostgreSQL or Supabase, set `DATABASE_URL` instead of the `POSTGRES_*` variables.

Important variables:

- `SESSION_SECRET`: required in production, use a long random value
- `CLIENT_URL`: browser URL used by the frontend
- `DATABASE_URL`: optional full PostgreSQL connection string

## Source

- GitHub: https://github.com/linuxhardened-org/open-server-inventory
- Security policy: https://github.com/linuxhardened-org/open-server-inventory/blob/main/SECURITY.md
