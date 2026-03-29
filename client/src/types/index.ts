export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator';
  totp_enabled: boolean;
  created_at: string;
}

export interface ApiToken {
  id: number;
  name: string;
  token?: string;
  created_at: string;
  last_used_at: string | null;
}

export interface Server {
  id: number;
  name: string;
  hostname: string;
  ip_address: string;
  status: 'active' | 'inactive' | 'maintenance' | 'online' | 'offline';
  group_id?: number;
  group_name?: string;
  tags?: string[];
  os?: string;
  cpu_cores?: number;
  ram_gb?: number;
  updated_at?: string;
  notes?: string;
  last_seen?: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  serverCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface SshKey {
  id: number;
  name: string;
  public_key: string;
  private_key?: string;
  fingerprint?: string;
  created_at: string;
}
