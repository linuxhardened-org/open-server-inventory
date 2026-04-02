package servervault

import (
	"context"
	"fmt"
)

// GroupsService operates on /api/groups.
type GroupsService struct{ c *Client }

// List returns all groups, each with a server count.
func (s *GroupsService) List(ctx context.Context) ([]Group, error) {
	var out []Group
	return out, s.c.do(ctx, "GET", "/groups", nil, &out)
}

// Create adds a new group. Returns the created Group (with its new ID).
func (s *GroupsService) Create(ctx context.Context, in *CreateGroupInput) (*Group, error) {
	var out Group
	return &out, s.c.do(ctx, "POST", "/groups", in, &out)
}

// Update replaces the name/description of an existing group.
func (s *GroupsService) Update(ctx context.Context, id int, in *UpdateGroupInput) error {
	return s.c.do(ctx, "PUT", fmt.Sprintf("/groups/%d", id), in, nil)
}

// Delete removes a group. Servers in the group have their group_id set to NULL.
func (s *GroupsService) Delete(ctx context.Context, id int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/groups/%d", id), nil, nil)
}
