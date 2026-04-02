package servervault

import (
	"context"
	"fmt"
)

// ServersService operates on /api/servers.
type ServersService struct{ c *Client }

// List returns all servers. Pass nil for default pagination (up to 5000).
func (s *ServersService) List(ctx context.Context, in *ListServersInput) ([]Server, error) {
	path := "/servers"
	if in != nil {
		limit := in.Limit
		if limit <= 0 {
			limit = 5000
		}
		path = fmt.Sprintf("/servers?limit=%d&offset=%d", limit, in.Offset)
	}
	var out []Server
	return out, s.c.do(ctx, "GET", path, nil, &out)
}

// Get returns a single server by ID, including disks, interfaces, tags, and history.
func (s *ServersService) Get(ctx context.Context, id int) (*Server, error) {
	var out Server
	return &out, s.c.do(ctx, "GET", fmt.Sprintf("/servers/%d", id), nil, &out)
}

// Create adds a new server to the inventory. Returns the new server's ID.
func (s *ServersService) Create(ctx context.Context, in *CreateServerInput) (int, error) {
	var out struct {
		ID int `json:"id"`
	}
	return out.ID, s.c.do(ctx, "POST", "/servers", in, &out)
}

// Update replaces all fields of an existing server.
// Name and Hostname are required; omitted optional fields are cleared.
func (s *ServersService) Update(ctx context.Context, id int, in *UpdateServerInput) error {
	return s.c.do(ctx, "PUT", fmt.Sprintf("/servers/%d", id), in, nil)
}

// Delete removes a server and all its related records (cascade).
func (s *ServersService) Delete(ctx context.Context, id int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/servers/%d", id), nil, nil)
}

// ── Disks ─────────────────────────────────────────────────────────────────────

// AddDisk attaches a disk record to a server. Returns the new disk's ID.
func (s *ServersService) AddDisk(ctx context.Context, serverID int, in *AddDiskInput) (int, error) {
	var out struct {
		ID int `json:"id"`
	}
	return out.ID, s.c.do(ctx, "POST", fmt.Sprintf("/servers/%d/disks", serverID), in, &out)
}

// DeleteDisk removes a disk record from a server.
func (s *ServersService) DeleteDisk(ctx context.Context, serverID, diskID int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/servers/%d/disks/%d", serverID, diskID), nil, nil)
}

// ── Interfaces ────────────────────────────────────────────────────────────────

// AddInterface attaches a network interface record to a server. Returns the new interface's ID.
func (s *ServersService) AddInterface(ctx context.Context, serverID int, in *AddInterfaceInput) (int, error) {
	var out struct {
		ID int `json:"id"`
	}
	return out.ID, s.c.do(ctx, "POST", fmt.Sprintf("/servers/%d/interfaces", serverID), in, &out)
}

// DeleteInterface removes a network interface record from a server.
func (s *ServersService) DeleteInterface(ctx context.Context, serverID, ifaceID int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/servers/%d/interfaces/%d", serverID, ifaceID), nil, nil)
}
