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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const node_cron_1 = __importDefault(require("node-cron"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const auth_1 = __importDefault(require("./routes/auth"));
const tokens_1 = __importDefault(require("./routes/tokens"));
const servers_1 = __importDefault(require("./routes/servers"));
const groups_1 = __importDefault(require("./routes/groups"));
const tags_1 = __importDefault(require("./routes/tags"));
const sshKeys_1 = __importDefault(require("./routes/sshKeys"));
const stats_1 = __importDefault(require("./routes/stats"));
const exportImport_1 = __importDefault(require("./routes/exportImport"));
const customColumns_1 = __importDefault(require("./routes/customColumns"));
const users_1 = __importDefault(require("./routes/users"));
const settings_1 = __importDefault(require("./routes/settings"));
const cloudProviders_1 = __importDefault(require("./routes/cloudProviders"));
const ips_1 = __importDefault(require("./routes/ips"));
const sessionAuth_1 = require("./middleware/sessionAuth");
const bearerAuth_1 = require("./middleware/bearerAuth");
const db_1 = __importStar(require("./db"));
const spaStatic_1 = require("./spaStatic");
const cloudSync_1 = require("./utils/cloudSync");
const realtime_1 = require("./realtime");
const PgSession = (0, connect_pg_simple_1.default)(express_session_1.default);
const app = (0, express_1.default)();
const PORT = env_1.env.port;
const httpServer = http_1.default.createServer(app);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: null, // disabled — app may run on HTTP
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use((0, cors_1.default)({
    origin: env_1.env.clientUrl,
    credentials: true
}));
app.use(express_1.default.json({ limit: '1mb' }));
const sessionMiddleware = (0, express_session_1.default)({
    store: new PgSession({
        pool: db_1.default.pool,
        tableName: 'session',
        pruneSessionInterval: 60 * 15, // prune expired sessions every 15 min
    }),
    secret: env_1.env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env_1.env.cookieSecure,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
});
app.use(sessionMiddleware);
// CSRF: custom header check — browsers cannot set X-Requested-With cross-origin
// without a CORS preflight, so its presence proves same-origin intent.
// Bearer token clients are exempt (API consumers set Authorization header directly).
app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method))
        return next();
    if (req.headers.authorization)
        return next();
    const xrw = req.headers['x-requested-with'];
    if (!xrw || String(xrw).toLowerCase() !== 'xmlhttprequest') {
        return res.status(403).json({ success: false, error: 'CSRF check failed' });
    }
    next();
});
// Mutation -> realtime invalidation bridge (keeps route handlers decoupled).
app.use((req, res, next) => {
    if (!req.originalUrl.startsWith('/api/'))
        return next();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method))
        return next();
    res.on('finish', () => {
        var _a, _b, _c, _d;
        if (res.statusCode >= 400)
            return;
        const [pathNoQuery] = req.originalUrl.split('?');
        const parts = pathNoQuery.split('/').filter(Boolean); // ['api', 'servers', ':id']
        const resource = (_a = parts[1]) !== null && _a !== void 0 ? _a : 'unknown';
        const targetId = parts[2];
        const action = req.method === 'POST'
            ? 'created'
            : req.method === 'DELETE'
                ? 'deleted'
                : 'updated';
        (0, realtime_1.emitRealtime)({
            resource,
            action,
            id: targetId,
            at: new Date().toISOString(),
            actor_user_id: (_d = (_c = (_b = req.session) === null || _b === void 0 ? void 0 : _b.userId) !== null && _c !== void 0 ? _c : req.userId) !== null && _d !== void 0 ? _d : null,
            meta: { path: pathNoQuery, status: res.statusCode },
        });
    });
    next();
});
// Health check endpoint
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
// Rate limiters
const loginLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const apiLimiter = (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
// Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/2fa', loginLimiter);
app.use('/api', apiLimiter);
app.use('/api/auth', auth_1.default);
// Protected routes (Session or Bearer)
const authMiddleware = (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth && /^[Bb]earer\s+sv_[a-f0-9]{64}$/.test(auth)) {
        return (0, bearerAuth_1.bearerAuth)(req, res, next);
    }
    return (0, sessionAuth_1.sessionAuth)(req, res, next);
};
app.use('/api/tokens', sessionAuth_1.sessionAuth, tokens_1.default);
app.use('/api/servers', authMiddleware, servers_1.default);
app.use('/api/custom-columns', authMiddleware, customColumns_1.default);
app.use('/api/groups', authMiddleware, groups_1.default);
app.use('/api/tags', authMiddleware, tags_1.default);
app.use('/api/ssh-keys', authMiddleware, sshKeys_1.default);
app.use('/api/stats', authMiddleware, stats_1.default);
app.use('/api/export-import', sessionAuth_1.sessionAuth, exportImport_1.default);
app.use('/api/users', users_1.default);
app.use('/api/settings', authMiddleware, settings_1.default);
app.use('/api/cloud-providers', sessionAuth_1.sessionAuth, cloudProviders_1.default);
app.use('/api/ips', authMiddleware, ips_1.default);
(0, spaStatic_1.attachClientSpa)(app);
// Error handling
app.use((err, req, res, next) => {
    const safeMethod = String(req.method).replace(/[^\w]/g, '').slice(0, 10);
    const safeUrl = String(req.originalUrl).replace(/[\r\n\t]/g, '').slice(0, 200);
    console.error(`[${safeMethod}] ${safeUrl} →`, err === null || err === void 0 ? void 0 : err.message); // codeql[js/tainted-format-string] - values are sanitized above
    const message = typeof (err === null || err === void 0 ? void 0 : err.message) === 'string' ? err.message.slice(0, 500) : 'Internal Server Error';
    res.status((err === null || err === void 0 ? void 0 : err.status) || 500).json({ success: false, error: message });
});
// Initialize Database before starting the server
(0, db_1.initDB)().then(() => {
    (0, realtime_1.initRealtime)(httpServer, sessionMiddleware);
    httpServer.listen(PORT, env_1.env.listenHost, () => {
        console.log(`ServerVault Backend running on http://${env_1.env.listenHost}:${PORT}`);
    });
    // Schedule cloud provider auto-sync - checks every 5 min, syncs per provider interval
    node_cron_1.default.schedule('*/5 * * * *', cloudSync_1.runAutoSync);
    console.log('Cloud auto-sync scheduler running (checks every 5 min, syncs per provider interval)');
}).catch(err => {
    console.error('Failed to start server due to database initialization error:', err);
    process.exit(1);
});
// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down gracefully...');
    httpServer.close(() => {
        db_1.default.pool.end(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
