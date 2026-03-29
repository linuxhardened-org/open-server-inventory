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
const sessionAuth_1 = require("../middleware/sessionAuth");
const router = (0, express_1.Router)();
router.get('/export', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const servers = yield db_1.default.query('SELECT * FROM servers');
        const groups = yield db_1.default.query('SELECT * FROM groups');
        const tags = yield db_1.default.query('SELECT * FROM tags');
        const ssh_keys = yield db_1.default.query('SELECT * FROM ssh_keys');
        const server_disks = yield db_1.default.query('SELECT * FROM server_disks');
        const server_interfaces = yield db_1.default.query('SELECT * FROM server_interfaces');
        const server_tags = yield db_1.default.query('SELECT * FROM server_tags');
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
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/import', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data } = req.body;
    if (!data)
        return (0, response_1.sendError)(res, 'No data provided');
    const client = yield db_1.default.pool.connect();
    try {
        yield client.query('BEGIN');
        // Clear all existing data
        yield client.query('DELETE FROM server_tags');
        yield client.query('DELETE FROM server_interfaces');
        yield client.query('DELETE FROM server_disks');
        yield client.query('DELETE FROM servers');
        yield client.query('DELETE FROM ssh_keys');
        yield client.query('DELETE FROM tags');
        yield client.query('DELETE FROM groups');
        // Insert new data
        if (data.groups) {
            for (const g of data.groups) {
                yield client.query('INSERT INTO groups (id, name, description) VALUES ($1, $2, $3)', [g.id, g.name, g.description]);
            }
        }
        if (data.tags) {
            for (const t of data.tags) {
                yield client.query('INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)', [t.id, t.name, t.color]);
            }
        }
        if (data.ssh_keys) {
            for (const k of data.ssh_keys) {
                yield client.query('INSERT INTO ssh_keys (id, name, public_key, private_key, created_at) VALUES ($1, $2, $3, $4, $5)', [k.id, k.name, k.public_key, k.private_key, k.created_at]);
            }
        }
        if (data.servers) {
            for (const s of data.servers) {
                yield client.query('INSERT INTO servers (id, name, hostname, ip_address, os, cpu_cores, ram_gb, group_id, ssh_key_id, status, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', [s.id, s.name, s.hostname, s.ip_address, s.os, s.cpu_cores, s.ram_gb, s.group_id, s.ssh_key_id, s.status, s.notes, s.created_at, s.updated_at]);
            }
        }
        if (data.server_disks) {
            for (const d of data.server_disks) {
                yield client.query('INSERT INTO server_disks (id, server_id, device, size_gb, mount_point, type) VALUES ($1, $2, $3, $4, $5, $6)', [d.id, d.server_id, d.device, d.size_gb, d.mount_point, d.type]);
            }
        }
        if (data.server_interfaces) {
            for (const i of data.server_interfaces) {
                yield client.query('INSERT INTO server_interfaces (id, server_id, name, mac_address, ip_address, type) VALUES ($1, $2, $3, $4, $5, $6)', [i.id, i.server_id, i.name, i.mac_address, i.ip_address, i.type]);
            }
        }
        if (data.server_tags) {
            for (const st of data.server_tags) {
                yield client.query('INSERT INTO server_tags (server_id, tag_id) VALUES ($1, $2)', [st.server_id, st.tag_id]);
            }
        }
        // Reset sequences
        yield client.query("SELECT setval('groups_id_seq', (SELECT MAX(id) FROM groups))");
        yield client.query("SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags))");
        yield client.query("SELECT setval('ssh_keys_id_seq', (SELECT MAX(id) FROM ssh_keys))");
        yield client.query("SELECT setval('servers_id_seq', (SELECT MAX(id) FROM servers))");
        yield client.query("SELECT setval('server_disks_id_seq', (SELECT MAX(id) FROM server_disks))");
        yield client.query("SELECT setval('server_interfaces_id_seq', (SELECT MAX(id) FROM server_interfaces))");
        yield client.query('COMMIT');
        (0, response_1.sendSuccess)(res, { message: 'Import successful' });
    }
    catch (err) {
        yield client.query('ROLLBACK');
        (0, response_1.sendError)(res, `Import failed: ${err.message}`);
    }
    finally {
        client.release();
    }
}));
exports.default = router;
