package servervault

import "context"

// StatsService operates on /api/stats.
type StatsService struct{ c *Client }

// StatusCount is a (status, count) pair from the stats endpoint.
type StatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

// GroupCount is a (name, count) pair from the stats endpoint.
type GroupCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// Capacity holds aggregate CPU/RAM figures.
type Capacity struct {
	AvgCPUCores float64 `json:"avgCpuCores"`
	AvgRAMGB    float64 `json:"avgRamGb"`
	TotalRAMGB  int     `json:"totalRamGb"`
}

// ActivityEntry is a recent audit-log entry returned by the stats endpoint.
type ActivityEntry struct {
	ID         int    `json:"id"`
	ServerID   int    `json:"serverId"`
	ServerName string `json:"serverName"`
	Action     string `json:"action"`
	Username   string `json:"username"`
	CreatedAt  string `json:"createdAt"`
}

// FullStats is the response from GET /api/stats.
type FullStats struct {
	Servers         int           `json:"servers"`
	Groups          int           `json:"groups"`
	Tags            int           `json:"tags"`
	SSHKeys         int           `json:"sshKeys"`
	ServersByStatus []StatusCount `json:"serversByStatus"`
	ServersByGroup  []GroupCount  `json:"serversByGroup"`
	Capacity        Capacity      `json:"capacity"`
	RecentActivity  []ActivityEntry `json:"recentActivity"`
}

// Get returns aggregate inventory statistics and the 20 most recent audit events.
func (s *StatsService) Get(ctx context.Context) (*FullStats, error) {
	var out FullStats
	return &out, s.c.do(ctx, "GET", "/stats", nil, &out)
}
