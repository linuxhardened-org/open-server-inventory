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
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const servers = yield db_1.default.query('SELECT COUNT(*) as count FROM servers');
        const groups = yield db_1.default.query('SELECT COUNT(*) as count FROM groups');
        const tags = yield db_1.default.query('SELECT COUNT(*) as count FROM tags');
        const keys = yield db_1.default.query('SELECT COUNT(*) as count FROM ssh_keys');
        (0, response_1.sendSuccess)(res, {
            servers: parseInt(servers.rows[0].count),
            groups: parseInt(groups.rows[0].count),
            tags: parseInt(tags.rows[0].count),
            sshKeys: parseInt(keys.rows[0].count)
        });
    }
    catch (err) {
        (0, response_1.sendError)(res, err.message);
    }
}));
exports.default = router;
