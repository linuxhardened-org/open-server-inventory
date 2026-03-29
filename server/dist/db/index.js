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
const pg_1 = require("pg");
const env_1 = require("../config/env");
const schema_1 = require("./schema");
const migrations_1 = require("./migrations");
const pool = new pg_1.Pool({
    host: env_1.env.postgres.host,
    port: env_1.env.postgres.port,
    user: env_1.env.postgres.user,
    password: env_1.env.postgres.password,
    database: env_1.env.postgres.database,
});
const initDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
