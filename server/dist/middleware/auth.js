"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token === 'dev-token') { // simplified bearer auth
            return next();
        }
    }
    res.status(401).json({ error: 'Unauthorized' });
};
exports.requireAuth = requireAuth;
