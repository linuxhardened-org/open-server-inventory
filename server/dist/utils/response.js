"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode).json({ success: true, data });
}
function sendError(res, message, statusCode = 400) {
    res.status(statusCode).json({ success: false, error: message });
}
