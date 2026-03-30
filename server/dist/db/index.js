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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = void 0;
exports.buildPoolConfig = buildPoolConfig;
exports.initPoolWithConfig = initPoolWithConfig;
exports.seedDefaultAdmin = seedDefaultAdmin;
const pg_1 = require("pg");
const env_1 = require("../config/env");
const schema_1 = require("./schema");
const migrations_1 = require("./migrations");
const crypto_1 = require("../utils/crypto");
function buildPoolConfig(databaseUrl) {
    const url = databaseUrl !== null && databaseUrl !== void 0 ? databaseUrl : env_1.env.databaseUrl;
    if (url) {
        return { connectionString: url, ssl: { rejectUnauthorized: false } };
    }
    const isLocal = env_1.env.postgres.host === 'localhost' ||
        env_1.env.postgres.host === '127.0.0.1' ||
        env_1.env.postgres.host === 'db';
    return Object.assign({ host: env_1.env.postgres.host, port: env_1.env.postgres.port, user: env_1.env.postgres.user, password: env_1.env.postgres.password, database: env_1.env.postgres.database }, (isLocal ? {} : { ssl: { rejectUnauthorized: false } }));
}
/** Create and verify a pool, then init schema + migrations on it. */
function initPoolWithConfig(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const p = new pg_1.Pool(config);
        yield p.query(schema_1.schema);
        yield (0, migrations_1.runMigrations)(p);
        return p;
    });
}
const pool = new pg_1.Pool(buildPoolConfig());
function seedDefaultAdmin(p) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield p.query('SELECT COUNT(*)::int AS count FROM users');
        if (rows[0].count > 0)
            return;
        const hash = yield (0, crypto_1.hashPassword)('Admin@123');
        yield p.query(`INSERT INTO users (username, password_hash, role, password_change_required)
     VALUES ($1, $2, 'admin', TRUE)`, ['Admin', hash]);
        console.log('Default admin seeded — username: Admin, password: Admin@123');
    });
}
const initDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(env_1.env.databaseUrl ? 'Using DATABASE_URL (SSL)' : 'Using local PostgreSQL');
        yield pool.query(schema_1.schema);
        yield (0, migrations_1.runMigrations)(pool);
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
});
exports.initDB = initDB;
exports.default = {
    query: (text, params) => pool.query(text, params),
    pool,
};
