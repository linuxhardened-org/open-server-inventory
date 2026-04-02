package servervault

import "fmt"

// APIError is returned when the ServerVault API responds with success: false
// or a non-2xx HTTP status.
type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("servervault: HTTP %d: %s", e.StatusCode, e.Message)
}

// IsNotFound reports whether the error is a 404 Not Found response.
func IsNotFound(err error) bool {
	if e, ok := err.(*APIError); ok {
		return e.StatusCode == 404
	}
	return false
}

// IsUnauthorized reports whether the error is a 401 Unauthorized response.
func IsUnauthorized(err error) bool {
	if e, ok := err.(*APIError); ok {
		return e.StatusCode == 401
	}
	return false
}

// IsForbidden reports whether the error is a 403 Forbidden response.
func IsForbidden(err error) bool {
	if e, ok := err.(*APIError); ok {
		return e.StatusCode == 403
	}
	return false
}
