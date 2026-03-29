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
const totp_1 = require("../utils/totp");
const response_1 = require("../utils/response");
const sessionAuth_1 = require("../middleware/sessionAuth");
const router = (0, express_1.Router)();
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        username: zod_1.z.string(),
        password: zod_1.z.string(),
        totpToken: zod_1.z.string().optional()
    });
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const { username, password, totpToken } = parseResult.data;
        const result = yield db_1.default.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user || !(yield (0, crypto_1.verifyPassword)(password, user.password_hash))) {
            return (0, response_1.sendError)(res, 'Invalid username or password', 401);
        }
        if (user.totp_enabled) {
            if (!totpToken || !(0, totp_1.verifyTotp)(totpToken, user.totp_secret)) {
                return (0, response_1.sendError)(res, 'Invalid TOTP token', 401);
            }
        }
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        (0, response_1.sendSuccess)(res, { id: user.id, username: user.username, role: user.role, totpEnabled: !!user.totp_enabled });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        (0, response_1.sendSuccess)(res, { message: 'Logged out' });
    });
});
router.get('/me', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT id, username, role, totp_enabled FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        (0, response_1.sendSuccess)(res, user);
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/2fa/setup', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        const secret = (0, totp_1.generateTotpSecret)();
        yield db_1.default.query('UPDATE users SET totp_enabling_secret = $1 WHERE id = $2', [secret, req.session.userId]);
        const qrCode = yield (0, totp_1.generateTotpUri)(secret, user.username);
        (0, response_1.sendSuccess)(res, { secret, qrCode });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/2fa/verify', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.body;
        const result = yield db_1.default.query('SELECT totp_enabling_secret FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        if (user.totp_enabling_secret && (0, totp_1.verifyTotp)(token, user.totp_enabling_secret)) {
            yield db_1.default.query('UPDATE users SET totp_secret = $1, totp_enabled = TRUE, totp_enabling_secret = NULL WHERE id = $2', [user.totp_enabling_secret, req.session.userId]);
            (0, response_1.sendSuccess)(res, { message: '2FA enabled' });
        }
        else {
            (0, response_1.sendError)(res, 'Invalid token');
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/change-password', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        const result = yield db_1.default.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        if (yield (0, crypto_1.verifyPassword)(currentPassword, user.password_hash)) {
            const newHash = yield (0, crypto_1.hashPassword)(newPassword);
            yield db_1.default.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.session.userId]);
            (0, response_1.sendSuccess)(res, { message: 'Password updated' });
        }
        else {
            (0, response_1.sendError)(res, 'Incorrect current password');
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
exports.default = router;
