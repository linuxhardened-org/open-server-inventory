// Package servervault is a Go SDK for the ServerVault API.
//
// It follows the same design as boto3: a top-level Client holds typed service
// objects (Servers, Groups, Tags, …) that map directly to the REST API.
//
// Quick start:
//
//	// From explicit credentials
//	sv := servervault.New("http://localhost:3000", "sv_abc123...")
//
//	// From environment variables (SERVERVAULT_BASE_URL, SERVERVAULT_TOKEN)
//	sv, err := servervault.NewFromEnv()
//
//	servers, err := sv.Servers.List(ctx, nil)
//	server, err := sv.Servers.Get(ctx, 42)
//	id, err := sv.Servers.Create(ctx, &servervault.CreateServerInput{...})
package servervault

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Client is the root ServerVault API client.
// Create one with [New] or [NewFromEnv].
type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client

	// Servers provides CRUD operations on server inventory entries.
	Servers *ServersService
	// Groups provides CRUD operations on server groups.
	Groups *GroupsService
	// Tags provides CRUD operations on tags.
	Tags *TagsService
	// SSHKeys provides CRUD operations on stored SSH key pairs.
	SSHKeys *SSHKeysService
	// IPs provides access to the merged IP address inventory.
	IPs *IPsService
	// Tokens provides management of API bearer tokens.
	// Note: token creation/deletion requires session auth in the web UI;
	// this service is provided for completeness and works when the SDK
	// is used alongside a session-authenticated caller.
	Tokens *TokensService
	// Stats provides read-only aggregate counts.
	Stats *StatsService
}

// Config holds optional overrides for Client construction.
type Config struct {
	// HTTPClient replaces the default http.Client (30 s timeout).
	HTTPClient *http.Client
	// Timeout overrides the per-request deadline. Ignored when HTTPClient is set.
	Timeout time.Duration
}

// New creates a Client from an explicit base URL and API token.
//
//	sv := servervault.New("http://localhost:3000", "sv_<64 hex chars>")
func New(baseURL, token string, cfg ...*Config) *Client {
	baseURL = strings.TrimRight(baseURL, "/")

	httpClient := &http.Client{Timeout: 30 * time.Second}
	if len(cfg) > 0 && cfg[0] != nil {
		c := cfg[0]
		if c.HTTPClient != nil {
			httpClient = c.HTTPClient
		} else if c.Timeout > 0 {
			httpClient.Timeout = c.Timeout
		}
	}

	cl := &Client{
		baseURL:    baseURL,
		token:      token,
		httpClient: httpClient,
	}
	cl.Servers = &ServersService{cl}
	cl.Groups = &GroupsService{cl}
	cl.Tags = &TagsService{cl}
	cl.SSHKeys = &SSHKeysService{cl}
	cl.IPs = &IPsService{cl}
	cl.Tokens = &TokensService{cl}
	cl.Stats = &StatsService{cl}
	return cl
}

// NewFromEnv creates a Client from environment variables.
//
// Required env vars:
//
//	SERVERVAULT_BASE_URL  e.g. http://localhost:3000
//	SERVERVAULT_TOKEN     e.g. sv_abc123...
func NewFromEnv(cfg ...*Config) (*Client, error) {
	baseURL := os.Getenv("SERVERVAULT_BASE_URL")
	if baseURL == "" {
		return nil, fmt.Errorf("servervault: SERVERVAULT_BASE_URL is not set")
	}
	token := os.Getenv("SERVERVAULT_TOKEN")
	if token == "" {
		return nil, fmt.Errorf("servervault: SERVERVAULT_TOKEN is not set")
	}
	return New(baseURL, token, cfg...), nil
}

// ── internal HTTP helper ──────────────────────────────────────────────────────

// apiResponse is the envelope that every ServerVault API response is wrapped in.
type apiResponse struct {
	Success bool            `json:"success"`
	Error   string          `json:"error"`
	Data    json.RawMessage `json:"data"`
}

// do executes an HTTP request against the ServerVault API.
//
//   - method: "GET", "POST", "PUT", "PATCH", "DELETE"
//   - path:   e.g. "/servers", "/servers/42"  (no /api prefix needed)
//   - body:   JSON-serialisable payload; pass nil for requests with no body
//   - out:    pointer to decode the response `data` field into; pass nil to discard
func (c *Client) do(ctx context.Context, method, path string, body, out any) error {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("servervault: marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+"/api"+path, reqBody)
	if err != nil {
		return fmt.Errorf("servervault: build request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("servervault: request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("servervault: read response body: %w", err)
	}

	var envelope apiResponse
	if err := json.Unmarshal(raw, &envelope); err != nil {
		// Non-JSON response (e.g. reverse proxy error page)
		return &APIError{StatusCode: resp.StatusCode, Message: string(raw)}
	}

	if !envelope.Success {
		return &APIError{StatusCode: resp.StatusCode, Message: envelope.Error}
	}

	if out != nil && len(envelope.Data) > 0 {
		if err := json.Unmarshal(envelope.Data, out); err != nil {
			return fmt.Errorf("servervault: decode response data: %w", err)
		}
	}
	return nil
}
