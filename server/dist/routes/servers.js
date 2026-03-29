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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
const serverSchema = zod_1.z.object({
    name: zod_1.z.string(),
    hostname: zod_1.z.string(),
    ip_address: zod_1.z.string().optional(),
    os: zod_1.z.string().optional(),
    cpu_cores: zod_1.z.number().optional(),
    ram_gb: zod_1.z.number().optional(),
    group_id: zod_1.z.number().nullable().optional(),
    ssh_key_id: zod_1.z.number().nullable().optional(),
    status: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.number()).optional(),
});
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const serversResult = yield db_1.default.query(`
      SELECT s.*, g.name as group_name, k.name as ssh_key_name
      FROM servers s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN ssh_keys k ON s.ssh_key_id = k.id
    `);
        const results = yield Promise.all(serversResult.rows.map((s) => __awaiter(void 0, void 0, void 0, function* () {
            const disksResult = yield db_1.default.query('SELECT * FROM server_disks WHERE server_id = $1', [s.id]);
            const interfacesResult = yield db_1.default.query('SELECT * FROM server_interfaces WHERE server_id = $1', [s.id]);
            const tagsResult = yield db_1.default.query(`
        SELECT t.* FROM tags t
        JOIN server_tags st ON t.id = st.tag_id
        WHERE st.server_id = $1
      `, [s.id]);
            return Object.assign(Object.assign({}, s), { disks: disksResult.rows, interfaces: interfacesResult.rows, tags: tagsResult.rows });
        })));
        (0, response_1.sendSuccess)(res, results);
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`
      SELECT s.*, g.name as group_name, k.name as ssh_key_name
      FROM servers s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN ssh_keys k ON s.ssh_key_id = k.id
      WHERE s.id = $1
    `, [req.params.id]);
        const s = result.rows[0];
        if (!s)
            return (0, response_1.sendError)(res, 'Server not found', 404);
        const disksResult = yield db_1.default.query('SELECT * FROM server_disks WHERE server_id = $1', [s.id]);
        const interfacesResult = yield db_1.default.query('SELECT * FROM server_interfaces WHERE server_id = $1', [s.id]);
        const tagsResult = yield db_1.default.query(`
      SELECT t.* FROM tags t
      JOIN server_tags st ON t.id = st.tag_id
      WHERE st.server_id = $1
    `, [s.id]);
        const historyResult = yield db_1.default.query(`
      SELECT h.*, u.username
      FROM server_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.server_id = $1
      ORDER BY h.created_at DESC
    `, [s.id]);
        (0, response_1.sendSuccess)(res, Object.assign(Object.assign({}, s), { disks: disksResult.rows, interfaces: interfacesResult.rows, tags: tagsResult.rows, history: historyResult.rows }));
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = serverSchema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    const _a = parseResult.data, { tags } = _a, data = __rest(_a, ["tags"]);
    const client = yield db_1.default.pool.connect();
    try {
        yield client.query('BEGIN');
        const insertResult = yield client.query(`
      INSERT INTO servers (name, hostname, ip_address, os, cpu_cores, ram_gb, group_id, ssh_key_id, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [data.name, data.hostname, data.ip_address || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null]);
        const serverId = insertResult.rows[0].id;
        if (tags && tags.length > 0) {
            for (const tagId of tags) {
                yield client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
            }
        }
        const userId = req.userId || req.session.userId;
        yield client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)', [serverId, userId, 'Server created']);
        yield client.query('COMMIT');
        (0, response_1.sendSuccess)(res, { id: serverId }, 201);
    }
    catch (err) {
        yield client.query('ROLLBACK');
        (0, response_1.sendError)(res, err.message);
    }
    finally {
        client.release();
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = serverSchema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    const _a = parseResult.data, { tags } = _a, data = __rest(_a, ["tags"]);
    const serverId = req.params.id;
    const client = yield db_1.default.pool.connect();
    try {
        yield client.query('BEGIN');
        yield client.query(`
      UPDATE servers SET name = $1, hostname = $2, ip_address = $3, os = $4, cpu_cores = $5, ram_gb = $6, group_id = $7, ssh_key_id = $8, status = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
    `, [data.name, data.hostname, data.ip_address || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null, serverId]);
        if (tags) {
            yield client.query('DELETE FROM server_tags WHERE server_id = $1', [serverId]);
            for (const tagId of tags) {
                yield client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
            }
        }
        const userId = req.userId || req.session.userId;
        yield client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)', [serverId, userId, 'Server updated']);
        yield client.query('COMMIT');
        (0, response_1.sendSuccess)(res, { message: 'Server updated' });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        (0, response_1.sendError)(res, err.message);
    }
    finally {
        client.release();
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query('DELETE FROM servers WHERE id = $1', [req.params.id]);
        (0, response_1.sendSuccess)(res, { message: 'Server deleted' });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
// Disk Management
router.post('/:id/disks', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({ device: zod_1.z.string(), size_gb: zod_1.z.number(), mount_point: zod_1.z.string().optional(), type: zod_1.z.string().optional() });
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const result = yield db_1.default.query('INSERT INTO server_disks (server_id, device, size_gb, mount_point, type) VALUES ($1, $2, $3, $4, $5) RETURNING id', [req.params.id, parseResult.data.device, parseResult.data.size_gb, parseResult.data.mount_point || null, parseResult.data.type || null]);
        (0, response_1.sendSuccess)(res, { id: result.rows[0].id });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.delete('/:id/disks/:diskId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query('DELETE FROM server_disks WHERE id = $1 AND server_id = $2', [req.params.diskId, req.params.id]);
        (0, response_1.sendSuccess)(res, { message: 'Disk deleted' });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
// Interface Management
router.post('/:id/interfaces', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({ name: zod_1.z.string(), mac_address: zod_1.z.string().optional(), ip_address: zod_1.z.string().optional(), type: zod_1.z.string().optional() });
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const result = yield db_1.default.query('INSERT INTO server_interfaces (server_id, name, mac_address, ip_address, type) VALUES ($1, $2, $3, $4, $5) RETURNING id', [req.params.id, parseResult.data.name, parseResult.data.mac_address || null, parseResult.data.ip_address || null, parseResult.data.type || null]);
        (0, response_1.sendSuccess)(res, { id: result.rows[0].id });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.delete('/:id/interfaces/:ifaceId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query('DELETE FROM server_interfaces WHERE id = $1 AND server_id = $2', [req.params.ifaceId, req.params.id]);
        (0, response_1.sendSuccess)(res, { message: 'Interface deleted' });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
exports.default = router;
