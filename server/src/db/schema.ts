export const schema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  real_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'operator',
  totp_secret TEXT,
  totp_enabling_secret TEXT, -- Temp storage for 2FA setup
  totp_enabled BOOLEAN DEFAULT FALSE,
  password_change_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  color VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS ssh_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50),
  os VARCHAR(100),
  cpu_cores INTEGER,
  ram_gb INTEGER,
  region VARCHAR(100),
  group_id INTEGER,
  ssh_key_id INTEGER,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  FOREIGN KEY (ssh_key_id) REFERENCES ssh_keys(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS server_disks (
  id SERIAL PRIMARY KEY,
  server_id INTEGER NOT NULL,
  device VARCHAR(255) NOT NULL,
  size_gb INTEGER NOT NULL,
  mount_point VARCHAR(255),
  type VARCHAR(50),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_interfaces (
  id SERIAL PRIMARY KEY,
  server_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  mac_address VARCHAR(50),
  ip_address VARCHAR(50),
  type VARCHAR(50),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_tags (
  server_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (server_id, tag_id),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_history (
  id SERIAL PRIMARY KEY,
  server_id INTEGER NOT NULL,
  user_id INTEGER,
  action VARCHAR(255) NOT NULL,
  changes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS custom_columns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(255) UNIQUE NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_custom_values (
  server_id INTEGER NOT NULL,
  custom_column_id INTEGER NOT NULL,
  value TEXT,
  PRIMARY KEY (server_id, custom_column_id),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY (custom_column_id) REFERENCES custom_columns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

CREATE INDEX IF NOT EXISTS idx_servers_group_id ON servers(group_id);
CREATE INDEX IF NOT EXISTS idx_servers_ssh_key_id ON servers(ssh_key_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_server_history_server_id ON server_history(server_id);
CREATE INDEX IF NOT EXISTS idx_server_tags_tag_id ON server_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_server_custom_values_column_id ON server_custom_values(custom_column_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
INSERT INTO app_settings (key, value) VALUES ('app_name', 'ServerVault') ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS cloud_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'linode',
  api_token TEXT NOT NULL,
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_hour INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  server_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE servers ADD COLUMN IF NOT EXISTS cloud_provider_id INTEGER REFERENCES cloud_providers(id) ON DELETE SET NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS cloud_instance_id VARCHAR(255);
`;
