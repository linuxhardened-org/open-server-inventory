package servervault

import (
	"context"
	"fmt"
)

// SSHKeysService operates on /api/ssh-keys.
type SSHKeysService struct{ c *Client }

// List returns all stored SSH keys.
// The private key is never returned; use HasPrivateKey to check if one exists.
func (s *SSHKeysService) List(ctx context.Context) ([]SSHKey, error) {
	var out []SSHKey
	return out, s.c.do(ctx, "GET", "/ssh-keys", nil, &out)
}

// Create stores a new SSH key pair. Returns the created SSHKey with its new ID.
// PrivateKey in the input is optional.
func (s *SSHKeysService) Create(ctx context.Context, in *CreateSSHKeyInput) (*SSHKey, error) {
	var out SSHKey
	return &out, s.c.do(ctx, "POST", "/ssh-keys", in, &out)
}

// Delete removes an SSH key. Servers referencing this key have their ssh_key_id set to NULL.
func (s *SSHKeysService) Delete(ctx context.Context, id int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/ssh-keys/%d", id), nil, nil)
}
