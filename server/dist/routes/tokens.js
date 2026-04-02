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
const token_1 = require("../utils/token");
const response_1 = require("../utils/response");
const sessionAuth_1 = require("../middleware/sessionAuth");
const router = (0, express_1.Router)();
// Expiry options: 7d, 30d, 90d, 365d, never (null)
const expiryOptions = ['7d', '30d', '90d', '365d', 'never'];
const createBody = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    expiry: zod_1.z.enum(expiryOptions).optional().default('never'),
});
function calculateExpiryDate(expiry) {
    if (expiry === 'never')
        return null;
    const days = parseInt(expiry);
    if (isNaN(days))
        return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}
router.get('/', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT id, name, expires_at, created_at, last_used_at FROM api_tokens WHERE user_id = $1', [req.session.userId]);
        (0, response_1.sendSuccess)(res, result.rows);
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const { name, expiry } = parsed.data;
        const token = (0, token_1.generateApiToken)();
        const tokenHash = (0, token_1.hashApiToken)(token);
        const expiresAt = calculateExpiryDate(expiry);
        yield db_1.default.query('INSERT INTO api_tokens (user_id, name, token_hash, expires_at) VALUES ($1, $2, $3, $4)', [req.session.userId, name, tokenHash, expiresAt]);
        (0, response_1.sendSuccess)(res, { name, token, expires_at: expiresAt });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/:id/regenerate', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verify ownership
        const existing = yield db_1.default.query('SELECT id, name FROM api_tokens WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
        if (existing.rows.length === 0) {
            return (0, response_1.sendError)(res, 'Token not found', 404);
        }
        const token = (0, token_1.generateApiToken)();
        const tokenHash = (0, token_1.hashApiToken)(token);
        yield db_1.default.query('UPDATE api_tokens SET token_hash = $1, created_at = CURRENT_TIMESTAMP WHERE id = $2', [tokenHash, req.params.id]);
        (0, response_1.sendSuccess)(res, { name: existing.rows[0].name, token });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.delete('/:id', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query('DELETE FROM api_tokens WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
        (0, response_1.sendSuccess)(res, { message: 'Token revoked' });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
exports.default = router;
