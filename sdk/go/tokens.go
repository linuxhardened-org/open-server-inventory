package servervault

import (
	"context"
	"fmt"
	"time"
)

// TokensService operates on /api/tokens.
//
// The tokens API requires session authentication in addition to bearer auth,
// so these methods will only work when the SDK client is used alongside a
// session cookie, or from a privileged automation context that can authenticate
// via session first. They are included here for completeness.
type TokensService struct{ c *Client }

// TokenExpiry controls when an API token expires.
type TokenExpiry string

const (
	TokenExpiry7d    TokenExpiry = "7d"
	TokenExpiry30d   TokenExpiry = "30d"
	TokenExpiry90d   TokenExpiry = "90d"
	TokenExpiry365d  TokenExpiry = "365d"
	TokenExpiryNever TokenExpiry = "never"
)

// CreateTokenRequest is the body for POST /api/tokens.
type CreateTokenRequest struct {
	Name   string      `json:"name"`
	Expiry TokenExpiry `json:"expiry,omitempty"`
}

// CreatedTokenResponse is returned by Create; the PlainToken is shown only once.
type CreatedTokenResponse struct {
	Name      string     `json:"name"`
	Token     string     `json:"token"` // plaintext — store immediately
	ExpiresAt *time.Time `json:"expires_at"`
}

// List returns all tokens belonging to the authenticated user.
func (s *TokensService) List(ctx context.Context) ([]Token, error) {
	var out []Token
	return out, s.c.do(ctx, "GET", "/tokens", nil, &out)
}

// Create generates a new API token. The plaintext token in the response is
// returned only once — store it immediately.
func (s *TokensService) Create(ctx context.Context, in *CreateTokenRequest) (*CreatedTokenResponse, error) {
	var out CreatedTokenResponse
	return &out, s.c.do(ctx, "POST", "/tokens", in, &out)
}

// Regenerate issues a new secret for an existing token (same name/expiry).
// The plaintext token in the response is returned only once.
func (s *TokensService) Regenerate(ctx context.Context, id int) (*CreatedTokenResponse, error) {
	var out CreatedTokenResponse
	return &out, s.c.do(ctx, "POST", fmt.Sprintf("/tokens/%d/regenerate", id), nil, &out)
}

// Revoke permanently deletes a token.
func (s *TokensService) Revoke(ctx context.Context, id int) error {
	return s.c.do(ctx, "DELETE", fmt.Sprintf("/tokens/%d", id), nil, nil)
}
