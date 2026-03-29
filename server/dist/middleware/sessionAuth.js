"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionAuth = void 0;
const response_1 = require("../utils/response");
const sessionAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    }
    else {
        (0, response_1.sendError)(res, 'Unauthorized: Session required', 401);
    }
};
exports.sessionAuth = sessionAuth;
