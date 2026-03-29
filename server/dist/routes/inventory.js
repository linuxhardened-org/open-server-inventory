"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/servers', (req, res) => {
    const servers = db_1.default.prepare('SELECT * FROM servers').all();
    res.json(servers);
});
router.post('/servers', (req, res) => {
    const { name, ip, groupId, status } = req.body;
    const stmt = db_1.default.prepare('INSERT INTO servers (name, ip, groupId, status) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, ip, groupId, status);
    res.json({ id: result.lastInsertRowid });
});
router.put('/servers/:id', (req, res) => {
    const { name, ip, groupId, status } = req.body;
    const stmt = db_1.default.prepare('UPDATE servers SET name = ?, ip = ?, groupId = ?, status = ? WHERE id = ?');
    stmt.run(name, ip, groupId, status, req.params.id);
    res.json({ success: true });
});
router.get('/groups', (req, res) => {
    const groups = db_1.default.prepare('SELECT * FROM groups').all();
    res.json(groups);
});
router.get('/tags', (req, res) => {
    const tags = db_1.default.prepare('SELECT * FROM tags').all();
    res.json(tags);
});
router.get('/ssh-keys', (req, res) => {
    const keys = db_1.default.prepare('SELECT * FROM ssh_keys').all();
    res.json(keys);
});
router.get('/export', (req, res) => {
    const servers = db_1.default.prepare('SELECT * FROM servers').all();
    res.json({ servers });
});
router.post('/import', (req, res) => {
    const { servers } = req.body;
    const insert = db_1.default.prepare('INSERT INTO servers (name, ip, groupId, status) VALUES (?, ?, ?, ?)');
    const insertMany = db_1.default.transaction((serversList) => {
        for (const s of serversList)
            insert.run(s.name, s.ip, s.groupId, s.status);
    });
    insertMany(servers || []);
    res.json({ success: true });
});
exports.default = router;
