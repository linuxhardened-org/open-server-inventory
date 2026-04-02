"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const util_1 = require("util");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const db_1 = __importStar(require("../db"));
const crypto_1 = require("../utils/crypto");
const totp_1 = require("../utils/totp");
const response_1 = require("../utils/response");
const sessionAuth_1 = require("../middleware/sessionAuth");
const persistedConfig_1 = require("../utils/persistedConfig");
const router = (0, express_1.Router)();
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
    totpToken: zod_1.z.string().optional(),
    rememberMe: zod_1.z.boolean().optional(),
});
const setupSchema = zod_1.z.object({
    app_name: zod_1.z.string().trim().min(1).max(80).optional(),
    database_url: zod_1.z.string().url().optional(),
});
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise((r) => setTimeout(r, ms));
    });
}
function canReachLocalDb() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.default.query('SELECT 1');
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
function ensureDockerLocalDb() {
    return __awaiter(this, void 0, void 0, function* () {
        // Project root where docker-compose.yml lives
        const projectRoot = path_1.default.resolve(process.cwd(), '..');
        // Optional: set SV_SETUP_DOCKER_SUDO=1 to prefix with sudo -n
        const useSudo = process.env.SV_SETUP_DOCKER_SUDO === '1';
        const prefix = useSudo ? 'sudo -n ' : '';
        const cmd = `${prefix}docker compose up -d --build db`;
        yield execAsync(cmd, { cwd: projectRoot, timeout: 120000, maxBuffer: 1024 * 1024 });
    });
}
// POST /api/auth/prepare-local-db — verify/prepare local DB for setup wizard
router.post('/prepare-local-db', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // If local DB isn't reachable, try to start/build dockerized postgres first.
        if (!(yield canReachLocalDb())) {
            try {
                yield ensureDockerLocalDb();
            }
            catch (err) {
                return (0, response_1.sendSuccess)(res, {
                    ready: false,
                    error: `Local DB is unreachable and Docker start failed: ${(err === null || err === void 0 ? void 0 : err.message) || 'unknown error'}`,
                });
            }
            // Wait for DB to become reachable
            let up = false;
            for (let i = 0; i < 15; i++) {
                if (yield canReachLocalDb()) {
                    up = true;
                    break;
                }
                yield sleep(1000);
            }
            if (!up) {
                return (0, response_1.sendSuccess)(res, {
                    ready: false,
                    error: 'PostgreSQL container started, but DB is still not reachable',
                });
            }
        }
        // Ensure local DB schema/migrations are ready before final setup submit.
        const { schema } = yield Promise.resolve().then(() => __importStar(require('../db/schema')));
        const { runMigrations } = yield Promise.resolve().then(() => __importStar(require('../db/migrations')));
        yield db_1.default.pool.query(schema);
        yield runMigrations(db_1.default.pool);
        const versionR = yield db_1.default.query('SELECT version() AS version');
        const version = ((_b = (_a = versionR.rows[0]) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : '').trim();
        (0, response_1.sendSuccess)(res, { ready: true, version: version ? version.split(' ').slice(0, 2).join(' ') : undefined });
    }
    catch (err) {
        // Keep 200-style payload so wizard can show inline retry state.
        (0, response_1.sendSuccess)(res, { ready: false, error: err.message || 'Could not initialize local database' });
    }
}));
// POST /api/auth/test-db — test a DATABASE_URL before committing during setup
router.post('/test-db', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = zod_1.z.object({ database_url: zod_1.z.string().min(1) }).safeParse(req.body);
    if (!parsed.success)
        return (0, response_1.sendError)(res, 'database_url is required', 400);
    const { Pool } = yield Promise.resolve().then(() => __importStar(require('pg')));
    const pool = new Pool({
        connectionString: parsed.data.database_url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
    });
    try {
        const result = yield pool.query('SELECT version() AS version');
        const version = result.rows[0].version;
        (0, response_1.sendSuccess)(res, {
            connected: true,
            version: version.split(' ').slice(0, 2).join(' '),
        });
    }
    catch (err) {
        (0, response_1.sendSuccess)(res, { connected: false, error: err.message });
    }
    finally {
        yield pool.end().catch(() => { });
    }
}));
router.post('/setup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = setupSchema.safeParse(req.body);
    if (!parsed.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const countResult = yield db_1.default.query('SELECT COUNT(*)::int AS count FROM users');
        const existingUsers = countResult.rows[0].count;
        if (existingUsers > 0) {
            return (0, response_1.sendError)(res, 'Setup already completed', 409);
        }
        const { app_name, database_url } = parsed.data;
        // If a custom DATABASE_URL was provided, init schema on that DB and save config.
        // The server will restart (Docker restart: always) to use the new connection.
        let targetDb = db_1.default;
        let requiresRestart = false;
        if (database_url) {
            const { Pool } = yield Promise.resolve().then(() => __importStar(require('pg')));
            const pool = new Pool({
                connectionString: database_url,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000,
            });
            try {
                const { schema } = yield Promise.resolve().then(() => __importStar(require('../db/schema')));
                const { runMigrations } = yield Promise.resolve().then(() => __importStar(require('../db/migrations')));
                yield pool.query(schema);
                yield runMigrations(pool);
                // Seed admin on the external DB before restart
                yield (0, db_1.seedDefaultAdmin)(pool);
                targetDb = {
                    query: (text, params) => pool.query(text, params),
                    pool,
                };
                (0, persistedConfig_1.savePersistedConfig)({ database_url });
                requiresRestart = true;
            }
            catch (err) {
                yield pool.end().catch(() => { });
                return (0, response_1.sendError)(res, `Database connection failed: ${err.message}`, 400);
            }
        }
        if (app_name) {
            yield targetDb.query('INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', ['app_name', app_name]);
        }
        if (!database_url) {
            // Local DB: seed default admin now
            yield (0, db_1.seedDefaultAdmin)(targetDb.pool);
        }
        if (requiresRestart) {
            // Config saved — restart server so the new DATABASE_URL pool is used from the start
            (0, response_1.sendSuccess)(res, { requiresRestart: true }, 201);
            setTimeout(() => process.exit(0), 400);
            return;
        }
        (0, response_1.sendSuccess)(res, { requiresRestart: false }, 201);
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === '23505')
            return (0, response_1.sendError)(res, 'Username already exists', 409);
        (0, response_1.sendError)(res, err.message || 'Setup failed');
    }
}));
router.get('/setup-status', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const result = yield db_1.default.query('SELECT COUNT(*)::int AS count FROM users');
        const count = result.rows[0].count;
        const nameResult = yield db_1.default.query(`SELECT value FROM app_settings WHERE key = 'app_name'`);
        const row = nameResult.rows[0];
        const app_name = ((_a = row === null || row === void 0 ? void 0 : row.value) === null || _a === void 0 ? void 0 : _a.trim()) || 'ServerVault';
        (0, response_1.sendSuccess)(res, { isSetupCompleted: count > 0, app_name });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Could not check setup status', 500);
    }
}));
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const { username, password, totpToken, rememberMe } = parseResult.data;
        const result = yield db_1.default.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user || !(yield (0, crypto_1.verifyPassword)(password, user.password_hash))) {
            return (0, response_1.sendError)(res, 'Invalid username or password', 401);
        }
        if (user.totp_enabled) {
            if (!totpToken || !user.totp_secret || !(0, totp_1.verifyTotp)(totpToken, user.totp_secret)) {
                return (0, response_1.sendError)(res, 'Invalid TOTP token', 401);
            }
        }
        req.session.regenerate((regErr) => {
            if (regErr) {
                console.error('session regenerate:', regErr);
                return (0, response_1.sendError)(res, 'Could not create session', 500);
            }
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            // If "remember me", extend session to 30 days instead of default 24h
            if (rememberMe) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            }
            (0, response_1.sendSuccess)(res, {
                id: user.id,
                username: user.username,
                realName: user.real_name,
                profilePictureUrl: user.profile_picture_url,
                role: user.role,
                totpEnabled: !!user.totp_enabled,
                passwordChangeRequired: !!user.password_change_required,
            });
        });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
// PUT /api/auth/change-password — force-change flow + voluntary change
router.put('/change-password', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        current_password: zod_1.z.string().min(1),
        new_password: zod_1.z.string().min(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return (0, response_1.sendError)(res, 'new_password must be at least 8 characters', 400);
    const { current_password, new_password } = parsed.data;
    try {
        const result = yield db_1.default.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        if (!user)
            return (0, response_1.sendError)(res, 'User not found', 404);
        if (!(yield (0, crypto_1.verifyPassword)(current_password, user.password_hash))) {
            return (0, response_1.sendError)(res, 'Current password is incorrect', 401);
        }
        if (yield (0, crypto_1.verifyPassword)(new_password, user.password_hash)) {
            return (0, response_1.sendError)(res, 'New password must be different from the current password', 400);
        }
        const newHash = yield (0, crypto_1.hashPassword)(new_password);
        yield db_1.default.query('UPDATE users SET password_hash = $1, password_change_required = FALSE WHERE id = $2', [newHash, req.session.userId]);
        (0, response_1.sendSuccess)(res, { message: 'Password updated' });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to change password');
    }
}));
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        (0, response_1.sendSuccess)(res, { message: 'Logged out' });
    });
});
router.get('/me', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT id, username, real_name, profile_picture_url, role, totp_enabled, created_at FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        (0, response_1.sendSuccess)(res, user);
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
// PATCH /api/auth/profile — update own profile (real_name)
router.patch('/profile', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const schema = zod_1.z.object({
        real_name: zod_1.z.string().max(255).nullable().optional(),
        profile_picture_url: zod_1.z
            .string()
            .trim()
            .max(2048)
            .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), 'Profile picture URL must be an absolute http(s) URL or app-relative path')
            .nullable()
            .optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return (0, response_1.sendError)(res, 'Invalid input', 400);
    const { real_name, profile_picture_url } = parsed.data;
    try {
        const result = yield db_1.default.query('UPDATE users SET real_name = $1, profile_picture_url = $2 WHERE id = $3 RETURNING id, username, real_name, profile_picture_url, role, totp_enabled, created_at', [real_name !== null && real_name !== void 0 ? real_name : null, profile_picture_url !== null && profile_picture_url !== void 0 ? profile_picture_url : null, req.session.userId]);
        if (result.rowCount && result.rowCount > 0) {
            (0, response_1.sendSuccess)(res, result.rows[0]);
        }
        else {
            (0, response_1.sendError)(res, 'User not found', 404);
        }
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message || 'Failed to update profile');
    }
}));
router.post('/2fa/setup', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        const secret = (0, totp_1.generateTotpSecret)();
        yield db_1.default.query('UPDATE users SET totp_enabling_secret = $1 WHERE id = $2', [secret, req.session.userId]);
        const qrCode = yield (0, totp_1.generateTotpUri)(secret, user.username);
        (0, response_1.sendSuccess)(res, { qrCode });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
const totpVerifyBody = zod_1.z.object({
    token: zod_1.z.string().regex(/^\d{6}$/, 'Enter a 6-digit code'),
});
router.post('/2fa/verify', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = totpVerifyBody.safeParse(req.body);
    if (!parsed.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const { token } = parsed.data;
        const result = yield db_1.default.query('SELECT totp_enabling_secret FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        if ((user === null || user === void 0 ? void 0 : user.totp_enabling_secret) && (0, totp_1.verifyTotp)(token, user.totp_enabling_secret)) {
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
const changePasswordBody = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8, 'New password must be at least 8 characters'),
});
router.post('/change-password', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = changePasswordBody.safeParse(req.body);
    if (!parsed.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const { currentPassword, newPassword } = parsed.data;
        const result = yield db_1.default.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        if (!user)
            return (0, response_1.sendError)(res, 'User not found', 404);
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
