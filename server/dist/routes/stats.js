"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [servers, groups, tags, keys, byStatus, byGroup, capacity, recentRows,] = yield Promise.all([
            db_1.default.query('SELECT COUNT(*)::text AS count FROM servers'),
            db_1.default.query('SELECT COUNT(*)::text AS count FROM groups'),
            db_1.default.query('SELECT COUNT(*)::text AS count FROM tags'),
            db_1.default.query('SELECT COUNT(*)::text AS count FROM ssh_keys'),
            db_1.default.query(`SELECT COALESCE(NULLIF(TRIM(status), ''), 'unknown') AS status, COUNT(*)::text AS count
         FROM servers GROUP BY 1 ORDER BY COUNT(*) DESC`),
            db_1.default.query(`SELECT COALESCE(g.name, 'Ungrouped') AS name, COUNT(*)::text AS count
         FROM servers s
         LEFT JOIN groups g ON g.id = s.group_id
         GROUP BY g.id, g.name
         ORDER BY COUNT(*) DESC`),
            db_1.default.query(`SELECT
           AVG(cpu_cores)::text AS avg_cpu,
           AVG(ram_gb)::text AS avg_ram,
           COALESCE(SUM(ram_gb), 0)::text AS total_ram
         FROM servers`),
            db_1.default.query(`SELECT h.id, h.server_id, h.action, h.created_at, s.name AS server_name, u.username
         FROM server_history h
         JOIN servers s ON s.id = h.server_id
         LEFT JOIN users u ON u.id = h.user_id
         ORDER BY h.created_at DESC
         LIMIT 20`),
        ]);
        const recentActivity = recentRows.rows.map((r) => ({
            id: r.id,
            serverId: r.server_id,
            serverName: r.server_name,
            action: r.action,
            username: r.username,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        }));
        (0, response_1.sendSuccess)(res, {
            servers: parseInt(servers.rows[0].count, 10),
            groups: parseInt(groups.rows[0].count, 10),
            tags: parseInt(tags.rows[0].count, 10),
            sshKeys: parseInt(keys.rows[0].count, 10),
            serversByStatus: byStatus.rows.map((row) => ({
                status: row.status,
                count: parseInt(row.count, 10),
            })),
            serversByGroup: byGroup.rows.map((row) => ({
                name: row.name,
                count: parseInt(row.count, 10),
            })),
            capacity: {
                avgCpuCores: capacity.rows[0].avg_cpu != null ? parseFloat(String(capacity.rows[0].avg_cpu)) : 0,
                avgRamGb: capacity.rows[0].avg_ram != null ? parseFloat(String(capacity.rows[0].avg_ram)) : 0,
                totalRamGb: capacity.rows[0].total_ram != null ? parseInt(String(capacity.rows[0].total_ram), 10) : 0,
            },
            recentActivity,
        });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
exports.default = router;
