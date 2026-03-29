import { Router } from 'express';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';

const router = Router();

router.get('/export', sessionAuth, async (req, res) => {
  try {
    const servers = await db.query('SELECT * FROM servers');
    const groups = await db.query('SELECT * FROM groups');
    const tags = await db.query('SELECT * FROM tags');
    const ssh_keys = await db.query('SELECT * FROM ssh_keys');
    const server_disks = await db.query('SELECT * FROM server_disks');
    const server_interfaces = await db.query('SELECT * FROM server_interfaces');
    const server_tags = await db.query('SELECT * FROM server_tags');

    const data = {
      servers: servers.rows,
      groups: groups.rows,
      tags: tags.rows,
      ssh_keys: ssh_keys.rows,
      server_disks: server_disks.rows,
      server_interfaces: server_interfaces.rows,
      server_tags: server_tags.rows,
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=servervault-export.json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/import', sessionAuth, async (req, res) => {
  const { data } = req.body;
  if (!data) return sendError(res, 'No data provided');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear all existing data
    await client.query('DELETE FROM server_tags');
    await client.query('DELETE FROM server_interfaces');
    await client.query('DELETE FROM server_disks');
    await client.query('DELETE FROM servers');
    await client.query('DELETE FROM ssh_keys');
    await client.query('DELETE FROM tags');
    await client.query('DELETE FROM groups');

    // Insert new data
    if (data.groups) {
      for (const g of data.groups) {
        await client.query('INSERT INTO groups (id, name, description) VALUES ($1, $2, $3)', [g.id, g.name, g.description]);
      }
    }
    
    if (data.tags) {
      for (const t of data.tags) {
        await client.query('INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)', [t.id, t.name, t.color]);
      }
    }

    if (data.ssh_keys) {
      for (const k of data.ssh_keys) {
        await client.query('INSERT INTO ssh_keys (id, name, public_key, private_key, created_at) VALUES ($1, $2, $3, $4, $5)', [k.id, k.name, k.public_key, k.private_key, k.created_at]);
      }
    }

    if (data.servers) {
      for (const s of data.servers) {
        await client.query('INSERT INTO servers (id, name, hostname, ip_address, os, cpu_cores, ram_gb, group_id, ssh_key_id, status, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', 
          [s.id, s.name, s.hostname, s.ip_address, s.os, s.cpu_cores, s.ram_gb, s.group_id, s.ssh_key_id, s.status, s.notes, s.created_at, s.updated_at]);
      }
    }

    if (data.server_disks) {
      for (const d of data.server_disks) {
        await client.query('INSERT INTO server_disks (id, server_id, device, size_gb, mount_point, type) VALUES ($1, $2, $3, $4, $5, $6)', [d.id, d.server_id, d.device, d.size_gb, d.mount_point, d.type]);
      }
    }

    if (data.server_interfaces) {
      for (const i of data.server_interfaces) {
        await client.query('INSERT INTO server_interfaces (id, server_id, name, mac_address, ip_address, type) VALUES ($1, $2, $3, $4, $5, $6)', [i.id, i.server_id, i.name, i.mac_address, i.ip_address, i.type]);
      }
    }

    if (data.server_tags) {
      for (const st of data.server_tags) {
        await client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [st.server_id, st.tag_id]);
      }
    }

    // Reset sequences
    await client.query("SELECT setval('groups_id_seq', (SELECT MAX(id) FROM groups))");
    await client.query("SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags))");
    await client.query("SELECT setval('ssh_keys_id_seq', (SELECT MAX(id) FROM ssh_keys))");
    await client.query("SELECT setval('servers_id_seq', (SELECT MAX(id) FROM servers))");
    await client.query("SELECT setval('server_disks_id_seq', (SELECT MAX(id) FROM server_disks))");
    await client.query("SELECT setval('server_interfaces_id_seq', (SELECT MAX(id) FROM server_interfaces))");

    await client.query('COMMIT');
    sendSuccess(res, { message: 'Import successful' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    sendError(res, `Import failed: ${err.message}`);
  } finally {
    client.release();
  }
});

export default router;
