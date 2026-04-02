package servervault

import (
	"context"
	"fmt"
)

// TagsService operates on /api/tags.
type TagsService struct{ c *Client }

// List returns all tags.
func (s *TagsService) List(ctx context.Context) ([]Tag, error) {
	var out []Tag
	return out, s.c.do(ctx, "GET", "/tags", nil, &out)
}

// Create adds a new tag. Returns the created Tag (with its new ID).
func (s *TagsService) Create(ctx context.Context, in *CreateTagInput) (*Tag, error) {
	var out Tag
	return &out, s.c.do(ctx, "POST", "/tags", in, &out)
}

// Update replaces the name/color of an existing tag.
func (s *TagsService) Update(ctx context.Context, id int, in *UpdateTagInput) error {
	return s.c.do(ctx, "PUT", fmt.Sprintf("/tags/%d", id), in, nil)
}

// Delete removes a tag. The tag is automatically removed from all servers.
func (s *TagsService) Delete(ctx context.Context, id int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/tags/%d", id), nil, nil)
}
