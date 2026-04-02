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
const collections_1 = require("../utils/collections");
const requestContext_1 = require("../utils/requestContext");
const router = (0, express_1.Router)();
const serverSchema = zod_1.z.object({
    name: zod_1.z.string(),
    hostname: zod_1.z.string(),
    ip_address: zod_1.z.string().optional(),
    private_ip: zod_1.z.string().optional(),
    ipv6_address: zod_1.z.string().optional(),
    private_ipv6: zod_1.z.string().optional(),
    os: zod_1.z.string().optional(),
    cpu_cores: zod_1.z.number().optional(),
    ram_gb: zod_1.z.number().optional(),
    group_id: zod_1.z.number().nullable().optional(),
    ssh_key_id: zod_1.z.number().nullable().optional(),
    status: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.number()).optional(),
    /** Map of custom column id (string) -> value */
    custom_values: zod_1.z.record(zod_1.z.string(), zod_1.z.string().nullable()).optional(),
});
function attachCustomValues(serverIds) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const map = new Map();
        if (serverIds.length === 0)
            return map;
        const r = yield db_1.default.query('SELECT server_id, custom_column_id, value FROM server_custom_values WHERE server_id = ANY($1::int[])', [serverIds]);
        for (const row of r.rows) {
            const cur = (_a = map.get(row.server_id)) !== null && _a !== void 0 ? _a : {};
            cur[String(row.custom_column_id)] = (_b = row.value) !== null && _b !== void 0 ? _b : '';
            map.set(row.server_id, cur);
        }
        return map;
    });
}
function saveCustomValues(client, serverId, customValues) {
    return __awaiter(this, void 0, void 0, function* () {
        if (customValues === undefined)
            return;
        yield client.query('DELETE FROM server_custom_values WHERE server_id = $1', [serverId]);
        for (const [colIdStr, val] of Object.entries(customValues)) {
            const colId = parseInt(colIdStr, 10);
            if (Number.isNaN(colId))
                continue;
            const col = yield client.query('SELECT id FROM custom_columns WHERE id = $1', [colId]);
            if (!col.rows.length)
                continue;
            yield client.query('INSERT INTO server_custom_values (server_id, custom_column_id, value) VALUES ($1, $2, $3)', [serverId, colId, val !== null && val !== void 0 ? val : null]);
        }
    });
}
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const limit = Math.min(parseInt(String((_a = req.query.limit) !== null && _a !== void 0 ? _a : '5000'), 10) || 5000, 5000);
        const offset = Math.max(parseInt(String((_b = req.query.offset) !== null && _b !== void 0 ? _b : '0'), 10) || 0, 0);
        // Fetch total count for pagination
        const countRes = yield db_1.default.query('SELECT COUNT(*)::int AS count FROM servers');
        const total = countRes.rows[0].count;
        const serversResult = yield db_1.default.query(`
      SELECT s.*, g.name as group_name, k.name as ssh_key_name
      FROM servers s
      LEFT JOIN groups g ON s.group_id = g.id
      LEFT JOIN ssh_keys k ON s.ssh_key_id = k.id
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
        const rows = serversResult.rows;
        const ids = rows.map((s) => s.id);
        if (ids.length === 0) {
            return (0, response_1.sendSuccess)(res, { servers: [], total });
        }
        const [disksRes, interfacesRes, tagsRes] = yield Promise.all([
            db_1.default.query('SELECT * FROM server_disks WHERE server_id = ANY($1::int[])', [ids]),
            db_1.default.query('SELECT * FROM server_interfaces WHERE server_id = ANY($1::int[])', [ids]),
            db_1.default.query(`
        SELECT st.server_id, t.id, t.name, t.color
        FROM server_tags st
        JOIN tags t ON t.id = st.tag_id
        WHERE st.server_id = ANY($1::int[])
      `, [ids]),
        ]);
        const disksBy = (0, collections_1.groupBy)(disksRes.rows, 'server_id');
        const ifBy = (0, collections_1.groupBy)(interfacesRes.rows, 'server_id');
        const tagsByServer = new Map();
        for (const r of tagsRes.rows) {
            const list = (_c = tagsByServer.get(r.server_id)) !== null && _c !== void 0 ? _c : [];
            list.push({ id: r.id, name: r.name, color: r.color });
            tagsByServer.set(r.server_id, list);
        }
        const customMap = yield attachCustomValues(ids);
        const results = rows.map((s) => {
            var _a, _b, _c, _d;
            const id = s.id;
            return Object.assign(Object.assign({}, s), { disks: (_a = disksBy.get(String(id))) !== null && _a !== void 0 ? _a : [], interfaces: (_b = ifBy.get(String(id))) !== null && _b !== void 0 ? _b : [], tags: (_c = tagsByServer.get(id)) !== null && _c !== void 0 ? _c : [], custom_values: (_d = customMap.get(id)) !== null && _d !== void 0 ? _d : {} });
        });
        (0, response_1.sendSuccess)(res, { servers: results, total });
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
    const _a = parseResult.data, { tags, custom_values } = _a, data = __rest(_a, ["tags", "custom_values"]);
    const client = yield db_1.default.pool.connect();
    try {
        yield client.query('BEGIN');
        const insertResult = yield client.query(`
      INSERT INTO servers (name, hostname, ip_address, private_ip, ipv6_address, private_ipv6, os, cpu_cores, ram_gb, group_id, ssh_key_id, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [data.name, data.hostname, data.ip_address || null, data.private_ip || null, data.ipv6_address || null, data.private_ipv6 || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null]);
        const serverId = insertResult.rows[0].id;
        yield saveCustomValues(client, serverId, custom_values);
        if (tags && tags.length > 0) {
            for (const tagId of tags) {
                yield client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
            }
        }
        const userId = (0, requestContext_1.getActorUserId)(req);
        yield client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)', [
            serverId,
            userId !== null && userId !== void 0 ? userId : null,
            'Server created',
        ]);
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
    const _a = parseResult.data, { tags, custom_values } = _a, data = __rest(_a, ["tags", "custom_values"]);
    const serverId = req.params.id;
    const client = yield db_1.default.pool.connect();
    try {
        yield client.query('BEGIN');
        yield client.query(`
      UPDATE servers SET name = $1, hostname = $2, ip_address = $3, private_ip = $4, ipv6_address = $5, private_ipv6 = $6, os = $7, cpu_cores = $8, ram_gb = $9, group_id = $10, ssh_key_id = $11, status = $12, notes = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
    `, [data.name, data.hostname, data.ip_address || null, data.private_ip || null, data.ipv6_address || null, data.private_ipv6 || null, data.os || null, data.cpu_cores || null, data.ram_gb || null, data.group_id || null, data.ssh_key_id || null, data.status || 'active', data.notes || null, serverId]);
        if (custom_values !== undefined) {
            yield saveCustomValues(client, Number(serverId), custom_values);
        }
        if (tags) {
            yield client.query('DELETE FROM server_tags WHERE server_id = $1', [serverId]);
            for (const tagId of tags) {
                yield client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [serverId, tagId]);
            }
        }
        const userId = (0, requestContext_1.getActorUserId)(req);
        yield client.query('INSERT INTO server_history (server_id, user_id, action) VALUES ($1, $2, $3)', [
            serverId,
            userId !== null && userId !== void 0 ? userId : null,
            'Server updated',
        ]);
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
        const result = yield db_1.default.query('DELETE FROM servers WHERE id = $1', [req.params.id]);
        if (!result.rowCount) {
            return (0, response_1.sendError)(res, 'Server not found', 404);
        }
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
