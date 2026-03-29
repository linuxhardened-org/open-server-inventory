"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = void 0;
const response_1 = require("../utils/response");
const adminAuth = (req, res, next) => {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        next();
    }
    else {
        (0, response_1.sendError)(res, 'Forbidden: Admin access required', 403);
    }
};
exports.adminAuth = adminAuth;
