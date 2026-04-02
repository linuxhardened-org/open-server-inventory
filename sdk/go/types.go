package servervault

import "time"

// ── Servers ───────────────────────────────────────────────────────────────────

// Server represents a server in the inventory.
type Server struct {
	ID              int               `json:"id"`
	Name            string            `json:"name"`
	Hostname        string            `json:"hostname"`
	IPAddress       string            `json:"ip_address"`
	PrivateIP       string            `json:"private_ip"`
	IPv6Address     string            `json:"ipv6_address"`
	PrivateIPv6     string            `json:"private_ipv6"`
	OS              string            `json:"os"`
	CPUCores        int               `json:"cpu_cores"`
	RAMGB           int               `json:"ram_gb"`
	Region          string            `json:"region"`
	GroupID         *int              `json:"group_id"`
	GroupName       string            `json:"group_name"`
	SSHKeyID        *int              `json:"ssh_key_id"`
	SSHKeyName      string            `json:"ssh_key_name"`
	Status          string            `json:"status"`
	Notes           string            `json:"notes"`
	CloudProviderID *int              `json:"cloud_provider_id"`
	CloudInstanceID string            `json:"cloud_instance_id"`
	Tags            []Tag             `json:"tags"`
	Disks           []Disk            `json:"disks"`
	Interfaces      []Interface       `json:"interfaces"`
	History         []HistoryEntry    `json:"history"`
	CustomValues    map[string]string `json:"custom_values"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

// Disk is a storage device attached to a server.
type Disk struct {
	ID         int    `json:"id"`
	ServerID   int    `json:"server_id"`
	Device     string `json:"device"`
	SizeGB     int    `json:"size_gb"`
	MountPoint string `json:"mount_point"`
	Type       string `json:"type"`
}

// Interface is a network interface attached to a server.
type Interface struct {
	ID         int    `json:"id"`
	ServerID   int    `json:"server_id"`
	Name       string `json:"name"`
	MACAddress string `json:"mac_address"`
	IPAddress  string `json:"ip_address"`
	Type       string `json:"type"`
}

// HistoryEntry is a single audit-log entry for a server.
type HistoryEntry struct {
	ID        int       `json:"id"`
	ServerID  int       `json:"server_id"`
	UserID    *int      `json:"user_id"`
	Username  string    `json:"username"`
	Action    string    `json:"action"`
	Changes   string    `json:"changes"`
	CreatedAt time.Time `json:"created_at"`
}

// CreateServerInput is the body for POST /api/servers.
// Name and Hostname are required; all other fields are optional.
type CreateServerInput struct {
	Name         string            `json:"name"`
	Hostname     string            `json:"hostname"`
	IPAddress    string            `json:"ip_address,omitempty"`
	PrivateIP    string            `json:"private_ip,omitempty"`
	IPv6Address  string            `json:"ipv6_address,omitempty"`
	PrivateIPv6  string            `json:"private_ipv6,omitempty"`
	OS           string            `json:"os,omitempty"`
	CPUCores     int               `json:"cpu_cores,omitempty"`
	RAMGB        int               `json:"ram_gb,omitempty"`
	Region       string            `json:"region,omitempty"`
	GroupID      *int              `json:"group_id,omitempty"`
	SSHKeyID     *int              `json:"ssh_key_id,omitempty"`
	Status       string            `json:"status,omitempty"`
	Notes        string            `json:"notes,omitempty"`
	Tags         []int             `json:"tags,omitempty"`
	CustomValues map[string]string `json:"custom_values,omitempty"`
}

// UpdateServerInput is the body for PUT /api/servers/:id.
// Name and Hostname are required by the server schema; all other fields are optional.
type UpdateServerInput = CreateServerInput

// AddDiskInput is the body for POST /api/servers/:id/disks.
type AddDiskInput struct {
	Device     string `json:"device"`
	SizeGB     int    `json:"size_gb"`
	MountPoint string `json:"mount_point,omitempty"`
	Type       string `json:"type,omitempty"`
}

// AddInterfaceInput is the body for POST /api/servers/:id/interfaces.
type AddInterfaceInput struct {
	Name       string `json:"name"`
	MACAddress string `json:"mac_address,omitempty"`
	IPAddress  string `json:"ip_address,omitempty"`
	Type       string `json:"type,omitempty"`
}

// ListServersInput holds optional query params for listing servers.
type ListServersInput struct {
	Limit  int // default 5000, max 5000
	Offset int
}

// ── Groups ────────────────────────────────────────────────────────────────────

// Group is a logical grouping of servers.
type Group struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ServerCount int    `json:"serverCount"`
}

// CreateGroupInput is the body for POST /api/groups.
type CreateGroupInput struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// UpdateGroupInput is the body for PUT /api/groups/:id.
type UpdateGroupInput = CreateGroupInput

// ── Tags ──────────────────────────────────────────────────────────────────────

// Tag is a label that can be applied to servers.
type Tag struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// CreateTagInput is the body for POST /api/tags.
type CreateTagInput struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// UpdateTagInput is the body for PUT /api/tags/:id.
type UpdateTagInput = CreateTagInput

// ── SSH Keys ──────────────────────────────────────────────────────────────────

// SSHKey is an SSH key pair stored in the inventory.
type SSHKey struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	PublicKey     string    `json:"public_key"`
	HasPrivateKey bool      `json:"has_private_key"`
	CreatedAt     time.Time `json:"created_at"`
}

// CreateSSHKeyInput is the body for POST /api/ssh-keys.
type CreateSSHKeyInput struct {
	Name       string `json:"name"`
	PublicKey  string `json:"public_key"`
	PrivateKey string `json:"private_key,omitempty"`
}

// ── IPs ───────────────────────────────────────────────────────────────────────

// IPType enumerates the kinds of IP addresses stored per server.
type IPType string

const (
	IPTypePublic     IPType = "public"
	IPTypePrivate    IPType = "private"
	IPTypeIPv6       IPType = "ipv6"
	IPTypePrivateIPv6 IPType = "private_ipv6"
)

// IP is an IP address entry, either from the server_ips catalog or embedded
// in the server record. Source field distinguishes these two cases.
type IP struct {
	ID             int       `json:"id"`
	ServerID       int       `json:"server_id"`
	IPAddress      string    `json:"ip_address"`
	IPType         IPType    `json:"ip_type"`
	Label          string    `json:"label"`
	ServerName     string    `json:"server_name"`
	ServerHostname string    `json:"server_hostname"`
	Source         string    `json:"source"` // "server" | "catalog"
	CreatedAt      time.Time `json:"created_at"`
}

// CreateIPInput is the body for POST /api/ips.
type CreateIPInput struct {
	ServerID  int    `json:"server_id"`
	IPAddress string `json:"ip_address"`
	IPType    IPType `json:"ip_type,omitempty"`
	Label     string `json:"label,omitempty"`
}

// UpdateIPInput is the body for PUT /api/ips/:id.
type UpdateIPInput struct {
	IPAddress string `json:"ip_address,omitempty"`
	IPType    IPType `json:"ip_type,omitempty"`
	Label     string `json:"label,omitempty"`
}

// ── API Tokens ────────────────────────────────────────────────────────────────

// Token is a bearer API token.
type Token struct {
	ID         int        `json:"id"`
	UserID     int        `json:"user_id"`
	Name       string     `json:"name"`
	ExpiresAt  *time.Time `json:"expires_at"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
}

// CreateTokenInput is the body for POST /api/tokens.
type CreateTokenInput struct {
	Name      string     `json:"name"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// CreatedToken is the response from POST /api/tokens.
// The plaintext token is only returned once.
type CreatedToken struct {
	Token
	PlainToken string `json:"token"`
}

// ── Stats ─────────────────────────────────────────────────────────────────────

// Stats holds aggregate inventory counts.
type Stats struct {
	TotalServers int `json:"totalServers"`
	ActiveCount  int `json:"activeCount"`
	TotalGroups  int `json:"totalGroups"`
	TotalTags    int `json:"totalTags"`
}
