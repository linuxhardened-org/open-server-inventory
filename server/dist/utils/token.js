"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiToken = generateApiToken;
exports.hashApiToken = hashApiToken;
const crypto_1 = __importDefault(require("crypto"));
/** Opaque API token prefix + random secret (shown once on creation). */
function generateApiToken() {
    return 'sv_' + crypto_1.default.randomBytes(32).toString('hex');
}
/** SHA-256 hex digest for at-rest storage and lookup (not reversible). */
function hashApiToken(plaintext) {
    return crypto_1.default.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}
