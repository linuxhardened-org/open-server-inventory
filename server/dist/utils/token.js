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
/** SHA-256 hex digest for at-rest storage and lookup.
 *  API tokens are 256-bit cryptographically random strings — SHA-256 is
 *  appropriate here. This is NOT a password hash. */
// codeql[js/insufficient-password-hash] - high-entropy random token, not a password
function hashApiToken(plaintext) {
    return crypto_1.default.createHash('sha256').update(plaintext, 'utf8').digest('hex'); // codeql[js/insufficient-password-hash]
}
