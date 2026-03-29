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
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
const tagSchema = zod_1.z.object({
    name: zod_1.z.string(),
    color: zod_1.z.string()
});
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT * FROM tags');
        (0, response_1.sendSuccess)(res, result.rows);
    }
    catch (error) {
        (0, response_1.sendError)(res, error.message);
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = tagSchema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const { name, color } = parseResult.data;
        const result = yield db_1.default.query('INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING id', [name, color]);
        (0, response_1.sendSuccess)(res, { id: result.rows[0].id, name, color }, 201);
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parseResult = tagSchema.safeParse(req.body);
    if (!parseResult.success)
        return (0, response_1.sendError)(res, 'Invalid input');
    try {
        const { name, color } = parseResult.data;
        yield db_1.default.query('UPDATE tags SET name = $1, color = $2 WHERE id = $3', [name, color, req.params.id]);
        (0, response_1.sendSuccess)(res, { id: req.params.id, name, color });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.query('DELETE FROM tags WHERE id = $1', [req.params.id]);
        (0, response_1.sendSuccess)(res, { message: 'Tag deleted' });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
exports.default = router;
