import db from './index';
import { hashPassword } from '../utils/crypto';

async function seed() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM server_tags');
    await client.query('DELETE FROM server_interfaces');
    await client.query('DELETE FROM server_disks');
    await client.query('DELETE FROM server_history');
    await client.query('DELETE FROM servers');
    await client.query('DELETE FROM groups');
    await client.query('DELETE FROM tags');
    await client.query('DELETE FROM api_tokens');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM ssh_keys');

    const users = [
      { username: 'admin', password: 'password123', role: 'admin' },
      { username: 'operator', password: 'password456', role: 'operator' }
    ];

    for (const user of users) {
      const hashedPassword = await hashPassword(user.password);
      await client.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [user.username, hashedPassword, user.role]);
    }

    const groupNames = ['Production', 'Staging', 'Development'];
    for (const name of groupNames) {
      await client.query('INSERT INTO groups (name) VALUES ($1)', [name]);
    }

    const tagData = [
      { name: 'Web Server', color: '#3b82f6' },
      { name: 'Database', color: '#ef4444' },
      { name: 'Redis', color: '#f59e0b' },
      { name: 'Nginx', color: '#10b981' }
    ];
    for (const tag of tagData) {
      await client.query('INSERT INTO tags (name, color) VALUES ($1, $2)', [tag.name, tag.color]);
    }

    const servers = Array.from({ length: 15 }, (_, i) => ({
      name: `srv-sv-${(i + 1).toString().padStart(2, '0')}`,
      hostname: `node-${(i + 1).toString().padStart(2, '0')}.sv.internal`,
      ip_address: `192.168.10.${100 + i}`,
      os: i % 2 === 0 ? 'Ubuntu 22.04 LTS' : 'Debian 12',
      cpu_cores: (i % 3 === 0) ? 4 : ((i % 5 === 0) ? 16 : 8),
      ram_gb: (i % 2 === 0) ? 16 : 32,
      group_id: (i % 3) + 1,
      status: 'active'
    }));

    for (let i = 0; i < servers.length; i++) {
      const s = servers[i];
      const result = await client.query(
        'INSERT INTO servers (name, hostname, ip_address, os, cpu_cores, ram_gb, group_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [s.name, s.hostname, s.ip_address, s.os, s.cpu_cores, s.ram_gb, s.group_id, s.status]
      );
      const serverId = result.rows[0].id;

      // Add disks
      await client.query('INSERT INTO server_disks (server_id, device, size_gb, mount_point, type) VALUES ($1, $2, $3, $4, $5)', [serverId, '/dev/sda1', 128, '/', 'SSD']);
      if (i % 2 === 0) {
        await client.query('INSERT INTO server_disks (server_id, device, size_gb, mount_point, type) VALUES ($1, $2, $3, $4, $5)', [serverId, '/dev/sdb1', 512, '/data', 'HDD']);
      }

      // Add interfaces
      await client.query('INSERT INTO server_interfaces (server_id, name, mac_address, ip_address, type) VALUES ($1, $2, $3, $4, $5)', [
        serverId, 'eth0', `52:54:00:ab:cd:${i.toString(16).padStart(2, '0')}`, s.ip_address, 'ethernet'
      ]);

      // Add random tags
      const tagId = (i % 4) + 1;
      await client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
    }

    await client.query('COMMIT');
    console.log('Seed: Successfully created 15 servers, 2 users, and associated data.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed().catch(console.error);
