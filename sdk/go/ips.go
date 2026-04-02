package servervault

import (
	"context"
	"fmt"
)

// IPsService operates on /api/ips.
//
// The IP inventory is a merged view: IPs from server record fields
// (ip_address, private_ip, ipv6_address, private_ipv6) and IPs from the
// server_ips catalog table are deduplicated and returned together.
//
// Only catalog rows (Source == "catalog", ID > 0) can be updated or deleted
// via this service. Embedded IPs must be changed by updating the server.
type IPsService struct{ c *Client }

// List returns all IP addresses across all servers, deduplicated.
func (s *IPsService) List(ctx context.Context) ([]IP, error) {
	var out []IP
	return out, s.c.do(ctx, "GET", "/ips", nil, &out)
}

// ListByServer returns IPs for a specific server (both embedded and catalog).
func (s *IPsService) ListByServer(ctx context.Context, serverID int) ([]IP, error) {
	var out []IP
	return out, s.c.do(ctx, "GET", fmt.Sprintf("/ips/server/%d", serverID), nil, &out)
}

// Create adds a new IP to the catalog (server_ips table). Returns the created IP.
func (s *IPsService) Create(ctx context.Context, in *CreateIPInput) (*IP, error) {
	var out IP
	return &out, s.c.do(ctx, "POST", "/ips", in, &out)
}

// Update modifies a catalog IP entry. Only catalog rows (positive ID) may be updated.
// Attempting to update an embedded IP (negative ID) returns an error.
func (s *IPsService) Update(ctx context.Context, id int, in *UpdateIPInput) (*IP, error) {
	var out IP
	return &out, s.c.do(ctx, "PUT", fmt.Sprintf("/ips/%d", id), in, &out)
}

// Delete removes a catalog IP entry. Only catalog rows (positive ID) may be deleted.
// Attempting to delete an embedded IP (negative ID) returns an error.
func (s *IPsService) Delete(ctx context.Context, id int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/ips/%d", id), nil, nil)
}
