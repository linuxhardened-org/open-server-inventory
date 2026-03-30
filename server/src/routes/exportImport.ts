import { Router } from 'express';
import type { PoolClient } from 'pg';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { sessionAuth } from '../middleware/sessionAuth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

const SEQUENCE_TABLES: { table: string; sequence: string }[] = [
  { table: 'groups', sequence: 'groups_id_seq' },
  { table: 'tags', sequence: 'tags_id_seq' },
  { table: 'ssh_keys', sequence: 'ssh_keys_id_seq' },
  { table: 'custom_columns', sequence: 'custom_columns_id_seq' },
  { table: 'servers', sequence: 'servers_id_seq' },
  { table: 'server_disks', sequence: 'server_disks_id_seq' },
  { table: 'server_interfaces', sequence: 'server_interfaces_id_seq' },
];

async function syncSequence(client: PoolClient, table: string, sequence: string): Promise<void> {
  const maxR = await client.query(`SELECT MAX(id) AS m FROM ${table}`);
  const m = maxR.rows[0].m as number | null;
  if (m === null) {
    await client.query('SELECT setval($1::regclass, 1, false)', [sequence]);
  } else {
    await client.query('SELECT setval($1::regclass, $2::bigint, true)', [sequence, m]);
  }
}

router.get('/export/csv', sessionAuth, async (req, res) => {
  try {
    const servers = await db.query(`
      SELECT
        s.id, s.name, s.hostname, s.ip_address, s.os, s.cpu_cores, s.ram_gb,
        s.region, s.status, s.notes, s.created_at, s.updated_at,
        g.name as group_name
      FROM servers s
      LEFT JOIN groups g ON s.group_id = g.id
      ORDER BY s.id
    `);

    const tags = await db.query(`
      SELECT st.server_id, t.name
      FROM server_tags st
      JOIN tags t ON st.tag_id = t.id
    `);

    const customCols = await db.query('SELECT id, name, key FROM custom_columns ORDER BY position');
    const customVals = await db.query('SELECT server_id, custom_column_id, value FROM server_custom_values');

    // Build tag map
    const tagMap: Record<number, string[]> = {};
    for (const t of tags.rows as { server_id: number; name: string }[]) {
      if (!tagMap[t.server_id]) tagMap[t.server_id] = [];
      tagMap[t.server_id].push(t.name);
    }

    // Build custom values map
    const cvMap: Record<number, Record<number, string>> = {};
    for (const v of customVals.rows as { server_id: number; custom_column_id: number; value: string }[]) {
      if (!cvMap[v.server_id]) cvMap[v.server_id] = {};
      cvMap[v.server_id][v.custom_column_id] = v.value;
    }

    const cols = customCols.rows as { id: number; name: string; key: string }[];

    // CSV header
    const headers = [
      'ID', 'Name', 'Hostname', 'IP Address', 'OS', 'CPU Cores', 'RAM (GB)',
      'Region', 'Status', 'Group', 'Tags', 'Notes', 'Created At', 'Updated At',
      ...cols.map(c => c.name)
    ];

    const escapeCSV = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = (servers.rows as any[]).map(s => [
      s.id,
      s.name,
      s.hostname,
      s.ip_address,
      s.os,
      s.cpu_cores,
      s.ram_gb,
      s.region,
      s.status,
      s.group_name,
      (tagMap[s.id] || []).join('; '),
      s.notes,
      s.created_at,
      s.updated_at,
      ...cols.map(c => cvMap[s.id]?.[c.id] || '')
    ]);

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=servervault-export.csv');
    res.send(csv);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get('/export', sessionAuth, async (req, res) => {
  try {
    const includePrivate =
      req.query.includePrivateKeys === 'true' || req.query.includePrivateKeys === '1';
    if (includePrivate && req.session.role !== 'admin') {
      return sendError(res, 'Including private SSH keys requires admin role', 403);
    }

    const servers = await db.query('SELECT * FROM servers');
    const groups = await db.query('SELECT * FROM groups');
    const tags = await db.query('SELECT * FROM tags');
    const sshKeysResult = await db.query('SELECT * FROM ssh_keys');
    const server_disks = await db.query('SELECT * FROM server_disks');
    const server_interfaces = await db.query('SELECT * FROM server_interfaces');
    const server_tags = await db.query('SELECT * FROM server_tags');
    const custom_columns = await db.query('SELECT * FROM custom_columns');
    const server_custom_values = await db.query('SELECT * FROM server_custom_values');

    let ssh_keys = sshKeysResult.rows;
    if (!includePrivate) {
      ssh_keys = ssh_keys.map((row: Record<string, unknown>) => ({
        ...row,
        private_key: null,
      }));
    }

    const data = {
      servers: servers.rows,
      groups: groups.rows,
      tags: tags.rows,
      ssh_keys,
      server_disks: server_disks.rows,
      server_interfaces: server_interfaces.rows,
      server_tags: server_tags.rows,
      custom_columns: custom_columns.rows,
      server_custom_values: server_custom_values.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=servervault-export.json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post('/import', sessionAuth, adminAuth, async (req, res) => {
  const { data } = req.body;
  if (!data) return sendError(res, 'No data provided');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM server_tags');
    await client.query('DELETE FROM server_interfaces');
    await client.query('DELETE FROM server_disks');
    await client.query('DELETE FROM servers');
    await client.query('DELETE FROM custom_columns');
    await client.query('DELETE FROM ssh_keys');
    await client.query('DELETE FROM tags');
    await client.query('DELETE FROM groups');

    if (data.groups) {
      for (const g of data.groups) {
        await client.query('INSERT INTO groups (id, name, description) VALUES ($1, $2, $3)', [
          g.id,
          g.name,
          g.description,
        ]);
      }
    }

    if (data.tags) {
      for (const t of data.tags) {
        await client.query('INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)', [
          t.id,
          t.name,
          t.color,
        ]);
      }
    }

    if (data.ssh_keys) {
      for (const k of data.ssh_keys) {
        await client.query(
          'INSERT INTO ssh_keys (id, name, public_key, private_key, created_at) VALUES ($1, $2, $3, $4, $5)',
          [k.id, k.name, k.public_key, k.private_key, k.created_at]
        );
      }
    }

    if (data.custom_columns) {
      for (const c of data.custom_columns) {
        await client.query(
          'INSERT INTO custom_columns (id, name, key, position, created_at) VALUES ($1, $2, $3, $4, $5)',
          [c.id, c.name, c.key, c.position, c.created_at]
        );
      }
    }

    if (data.servers) {
      for (const s of data.servers) {
        await client.query(
          `INSERT INTO servers (id, name, hostname, ip_address, os, cpu_cores, ram_gb, group_id, ssh_key_id, status, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            s.id,
            s.name,
            s.hostname,
            s.ip_address,
            s.os,
            s.cpu_cores,
            s.ram_gb,
            s.group_id,
            s.ssh_key_id,
            s.status,
            s.notes,
            s.created_at,
            s.updated_at,
          ]
        );
      }
    }

    if (data.server_disks) {
      for (const d of data.server_disks) {
        await client.query(
          'INSERT INTO server_disks (id, server_id, device, size_gb, mount_point, type) VALUES ($1, $2, $3, $4, $5, $6)',
          [d.id, d.server_id, d.device, d.size_gb, d.mount_point, d.type]
        );
      }
    }

    if (data.server_interfaces) {
      for (const i of data.server_interfaces) {
        await client.query(
          'INSERT INTO server_interfaces (id, server_id, name, mac_address, ip_address, type) VALUES ($1, $2, $3, $4, $5, $6)',
          [i.id, i.server_id, i.name, i.mac_address, i.ip_address, i.type]
        );
      }
    }

    if (data.server_tags) {
      for (const st of data.server_tags) {
        await client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [
          st.server_id,
          st.tag_id,
        ]);
      }
    }

    if (data.server_custom_values) {
      for (const v of data.server_custom_values) {
        await client.query(
          'INSERT INTO server_custom_values (server_id, custom_column_id, value) VALUES ($1, $2, $3)',
          [v.server_id, v.custom_column_id, v.value]
        );
      }
    }

    for (const { table, sequence } of SEQUENCE_TABLES) {
      await syncSequence(client, table, sequence);
    }

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
