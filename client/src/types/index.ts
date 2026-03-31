export interface User {
  id: number;
  username: string;
  real_name?: string;
  profile_picture_url?: string | null;
  role: 'admin' | 'operator';
  totp_enabled: boolean;
  password_change_required?: boolean;
  created_at: string;
}

export interface ApiToken {
  id: number;
  name: string;
  token?: string;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface ServerTag {
  id: number;
  name: string;
  color: string | null;
}

export interface Server {
  id: number;
  name: string;
  hostname: string;
  ip_address: string | null;
  private_ip?: string | null;
  ipv6_address?: string | null;
  private_ipv6?: string | null;
  status: 'active' | 'inactive' | 'maintenance' | 'online' | 'offline';
  group_id?: number;
  group_name?: string;
  tags?: ServerTag[] | string[];
  os?: string;
  cpu_cores?: number;
  ram_gb?: number;
  region?: string;
  updated_at?: string;
  notes?: string;
  last_seen?: string;
  cloud_provider_id?: number;
  /** JSON from Linode sync: additional public IPs, VPC, NAT, subnets */
  linode_network_extras?: string | null;
  /** Custom field values keyed by custom column id (string) */
  custom_values?: Record<string, string>;
}

export interface CustomColumn {
  id: number;
  name: string;
  key: string;
  position: number;
  created_at: string;
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
