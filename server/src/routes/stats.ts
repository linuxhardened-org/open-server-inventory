import { Router } from 'express';
import db from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [
      servers,
      groups,
      tags,
      keys,
      byStatus,
      byGroup,
      capacity,
      recentRows,
    ] = await Promise.all([
      db.query('SELECT COUNT(*)::text AS count FROM servers'),
      db.query('SELECT COUNT(*)::text AS count FROM groups'),
      db.query('SELECT COUNT(*)::text AS count FROM tags'),
      db.query('SELECT COUNT(*)::text AS count FROM ssh_keys'),
      db.query(
        `SELECT COALESCE(NULLIF(TRIM(status), ''), 'unknown') AS status, COUNT(*)::text AS count
         FROM servers GROUP BY 1 ORDER BY count::int DESC`
      ),
      db.query(
        `SELECT COALESCE(g.name, 'Ungrouped') AS name, COUNT(*)::text AS count
         FROM servers s
         LEFT JOIN groups g ON g.id = s.group_id
         GROUP BY g.id, g.name
         ORDER BY count::int DESC`
      ),
      db.query(
        `SELECT
           AVG(cpu_cores)::text AS avg_cpu,
           AVG(ram_gb)::text AS avg_ram,
           COALESCE(SUM(ram_gb), 0)::text AS total_ram
         FROM servers`
      ),
      db.query(
        `SELECT h.id, h.server_id, h.action, h.created_at, s.name AS server_name, u.username
         FROM server_history h
         JOIN servers s ON s.id = h.server_id
         LEFT JOIN users u ON u.id = h.user_id
         ORDER BY h.created_at DESC
         LIMIT 20`
      ),
    ]);

    const recentActivity = recentRows.rows.map((r: any) => ({
      id: r.id,
      serverId: r.server_id,
      serverName: r.server_name,
      action: r.action,
      username: r.username,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));

    sendSuccess(res, {
      servers: parseInt(servers.rows[0].count, 10),
      groups: parseInt(groups.rows[0].count, 10),
      tags: parseInt(tags.rows[0].count, 10),
      sshKeys: parseInt(keys.rows[0].count, 10),
      serversByStatus: byStatus.rows.map((row: any) => ({
        status: row.status,
        count: parseInt(row.count, 10),
      })),
      serversByGroup: byGroup.rows.map((row: any) => ({
        name: row.name,
        count: parseInt(row.count, 10),
      })),
      capacity: {
        avgCpuCores:
          capacity.rows[0].avg_cpu != null ? parseFloat(String(capacity.rows[0].avg_cpu)) : 0,
        avgRamGb: capacity.rows[0].avg_ram != null ? parseFloat(String(capacity.rows[0].avg_ram)) : 0,
        totalRamGb:
          capacity.rows[0].total_ram != null ? parseInt(String(capacity.rows[0].total_ram), 10) : 0,
      },
      recentActivity,
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
