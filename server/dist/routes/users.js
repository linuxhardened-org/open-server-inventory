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
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db"));
const crypto_1 = require("../utils/crypto");
const response_1 = require("../utils/response");
const adminAuth_1 = require("../middleware/adminAuth");
const sessionAuth_1 = require("../middleware/sessionAuth");
const router = (0, express_1.Router)();
// Only admins can access these routes
router.use(sessionAuth_1.sessionAuth, adminAuth_1.adminAuth);
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT id, username, role, totp_enabled, created_at FROM users');
        (0, response_1.sendSuccess)(res, result.rows);
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        username: zod_1.z.string().min(3),
        password: zod_1.z.string().min(6),
        role: zod_1.z.enum(['admin', 'operator']).default('operator')
    });
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    const { username, password, role } = parseResult.data;
    try {
        const hashedPassword = yield (0, crypto_1.hashPassword)(password);
        yield db_1.default.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [username, hashedPassword, role]);
        (0, response_1.sendSuccess)(res, { message: 'User created' }, 201);
    }
    catch (err) {
        if (err.message.includes('unique constraint') || err.code === '23505') {
            return (0, response_1.sendError)(res, 'Username already exists');
        }
        (0, response_1.sendError)(res, `Failed to create user: ${err.message}`);
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Prevent deleting oneself
    if (parseInt(id) === req.session.userId) {
        return (0, response_1.sendError)(res, 'You cannot delete yourself');
    }
    try {
        const result = yield db_1.default.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount && result.rowCount > 0) {
            (0, response_1.sendSuccess)(res, { message: 'User deleted' });
        }
        else {
            (0, response_1.sendError)(res, 'User not found');
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.patch('/:id/role', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { role } = req.body;
    if (role !== 'admin' && role !== 'operator') {
        return (0, response_1.sendError)(res, 'Invalid role');
    }
    // Prevent changing one's own role
    if (parseInt(id) === req.session.userId) {
        return (0, response_1.sendError)(res, 'You cannot change your own role');
    }
    try {
        const result = yield db_1.default.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        if (result.rowCount && result.rowCount > 0) {
            (0, response_1.sendSuccess)(res, { message: 'User role updated' });
        }
        else {
            (0, response_1.sendError)(res, 'User not found');
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
exports.default = router;
