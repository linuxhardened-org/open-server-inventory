package servervault_test

import (
	"context"
	"fmt"
	"log"
	"time"

	servervault "github.com/servervault/sdk"
)

// ExampleNew demonstrates creating a client from explicit credentials.
func ExampleNew() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	_ = sv
}

// ExampleNewFromEnv demonstrates creating a client from environment variables.
// Set SERVERVAULT_BASE_URL and SERVERVAULT_TOKEN before running.
func ExampleNewFromEnv() {
	sv, err := servervault.NewFromEnv()
	if err != nil {
		log.Fatal(err)
	}
	_ = sv
}

// ExampleServersService_List lists all servers in the inventory.
func ExampleServersService_List() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	servers, err := sv.Servers.List(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}
	for _, s := range servers {
		fmt.Printf("%d  %-30s  %s  %s\n", s.ID, s.Name, s.IPAddress, s.Status)
	}
}

// ExampleServersService_List_paginated lists servers with explicit pagination.
func ExampleServersService_List_paginated() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	page, err := sv.Servers.List(ctx, &servervault.ListServersInput{
		Limit:  100,
		Offset: 0,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("page size:", len(page))
}

// ExampleServersService_Create shows how to add a new server to the inventory.
func ExampleServersService_Create() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	groupID := 3

	id, err := sv.Servers.Create(ctx, &servervault.CreateServerInput{
		Name:      "web-01",
		Hostname:  "web-01.prod.example.com",
		IPAddress: "203.0.113.10",
		PrivateIP: "10.0.0.10",
		OS:        "Ubuntu 24.04",
		CPUCores:  4,
		RAMGB:     8,
		Region:    "us-east-1",
		GroupID:   &groupID,
		Status:    "active",
		Notes:     "Primary web server",
		Tags:      []int{1, 2}, // tag IDs
		CustomValues: map[string]string{
			"1": "value-for-custom-col-1",
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("created server id:", id)
}

// ExampleServersService_Update updates an existing server.
func ExampleServersService_Update() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	// Fetch current state first so required fields are preserved.
	server, err := sv.Servers.Get(ctx, 42)
	if err != nil {
		log.Fatal(err)
	}

	err = sv.Servers.Update(ctx, server.ID, &servervault.UpdateServerInput{
		Name:      server.Name,
		Hostname:  server.Hostname,
		IPAddress: server.IPAddress,
		Status:    "inactive", // only change
	})
	if err != nil {
		log.Fatal(err)
	}
}

// ExampleServersService_AddDisk attaches a disk to a server.
func ExampleServersService_AddDisk() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	diskID, err := sv.Servers.AddDisk(ctx, 42, &servervault.AddDiskInput{
		Device:     "/dev/sdb",
		SizeGB:     500,
		MountPoint: "/data",
		Type:       "SSD",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("disk id:", diskID)
}

// ExampleGroupsService demonstrates full CRUD on groups.
func ExampleGroupsService() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	// Create
	g, err := sv.Groups.Create(ctx, &servervault.CreateGroupInput{
		Name:        "production",
		Description: "All production servers",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("created group:", g.ID, g.Name)

	// Update
	if err := sv.Groups.Update(ctx, g.ID, &servervault.UpdateGroupInput{
		Name:        "production",
		Description: "All production servers — updated",
	}); err != nil {
		log.Fatal(err)
	}

	// List
	groups, err := sv.Groups.List(ctx)
	if err != nil {
		log.Fatal(err)
	}
	for _, grp := range groups {
		fmt.Printf("  %d  %-20s  servers: %d\n", grp.ID, grp.Name, grp.ServerCount)
	}

	// Delete
	if err := sv.Groups.Delete(ctx, g.ID); err != nil {
		log.Fatal(err)
	}
}

// ExampleTagsService demonstrates creating and listing tags.
func ExampleTagsService() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	tag, err := sv.Tags.Create(ctx, &servervault.CreateTagInput{
		Name:  "k8s",
		Color: "#326CE5",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("created tag:", tag.ID, tag.Name)
}

// ExampleSSHKeysService_Create stores a new SSH public key.
func ExampleSSHKeysService_Create() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	key, err := sv.SSHKeys.Create(ctx, &servervault.CreateSSHKeyInput{
		Name:      "deploy-key",
		PublicKey: "ssh-ed25519 AAAA... user@host",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("stored key id:", key.ID)
}

// ExampleIPsService_List lists all IP addresses across the inventory.
func ExampleIPsService_List() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	ips, err := sv.IPs.List(ctx)
	if err != nil {
		log.Fatal(err)
	}
	for _, ip := range ips {
		fmt.Printf("%-18s  %-12s  %s  (%s)\n",
			ip.IPAddress, ip.IPType, ip.ServerName, ip.Source)
	}
}

// ExampleIPsService_Create adds an extra IP to a server's catalog.
func ExampleIPsService_Create() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	ip, err := sv.IPs.Create(ctx, &servervault.CreateIPInput{
		ServerID:  42,
		IPAddress: "203.0.113.20",
		IPType:    servervault.IPTypePublic,
		Label:     "Failover IP",
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("catalog ip id:", ip.ID)
}

// ExampleTokensService_Create shows how to create a scoped API token.
func ExampleTokensService_Create() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	created, err := sv.Tokens.Create(ctx, &servervault.CreateTokenRequest{
		Name:   "ci-pipeline",
		Expiry: servervault.TokenExpiry90d,
	})
	if err != nil {
		log.Fatal(err)
	}
	// Store created.Token immediately — it is shown only once.
	fmt.Println("token (store now):", created.Token)
	if created.ExpiresAt != nil {
		fmt.Println("expires:", created.ExpiresAt.Format(time.RFC3339))
	}
}

// ExampleStatsService_Get retrieves inventory-wide statistics.
func ExampleStatsService_Get() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	stats, err := sv.Stats.Get(ctx)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("servers: %d  groups: %d  tags: %d\n",
		stats.Servers, stats.Groups, stats.Tags)
	fmt.Printf("avg CPU: %.1f cores  total RAM: %d GB\n",
		stats.Capacity.AvgCPUCores, stats.Capacity.TotalRAMGB)
	fmt.Println("recent activity:")
	for _, a := range stats.RecentActivity {
		fmt.Printf("  [%s] %s — %s\n", a.CreatedAt, a.ServerName, a.Action)
	}
}

// ExampleIsNotFound shows error type checking.
func ExampleIsNotFound() {
	sv := servervault.New("http://localhost:3000", "sv_yourtokenhere")
	ctx := context.Background()

	_, err := sv.Servers.Get(ctx, 99999)
	if servervault.IsNotFound(err) {
		fmt.Println("server does not exist")
	} else if err != nil {
		log.Fatal(err)
	}
}
