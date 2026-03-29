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
const token_1 = require("../utils/token");
const response_1 = require("../utils/response");
const sessionAuth_1 = require("../middleware/sessionAuth");
const router = (0, express_1.Router)();
router.get('/', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT id, name, created_at, last_used_at FROM api_tokens WHERE user_id = $1', [req.session.userId]);
        (0, response_1.sendSuccess)(res, result.rows);
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.post('/', sessionAuth_1.sessionAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!name)
            return (0, response_1.sendError)(res, 'Name is required');
        const token = (0, token_1.generateApiToken)();
        yield db_1.default.query('INSERT INTO api_tokens (user_id, name, token) VALUES ($1, $2, $3)', [req.session.userId, name, token]);
        (0, response_1.sendSuccess)(res, { name, token });
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
