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
exports.bearerAuth = void 0;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const bearerAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (0, response_1.sendError)(res, 'Unauthorized: Bearer token required', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const result = yield db_1.default.query('SELECT * FROM api_tokens WHERE token = $1', [token]);
        const apiToken = result.rows[0];
        if (apiToken) {
            yield db_1.default.query('UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiToken.id]);
            req.userId = apiToken.user_id;
            next();
        }
        else {
            (0, response_1.sendError)(res, 'Unauthorized: Invalid API token', 401);
        }
    }
    catch (error) {
        console.error('Database error in bearerAuth:', error);
        (0, response_1.sendError)(res, 'Internal Server Error', 500);
    }
});
exports.bearerAuth = bearerAuth;
