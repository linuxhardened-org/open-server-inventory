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
exports.generateTotpSecret = generateTotpSecret;
exports.generateTotpUri = generateTotpUri;
exports.verifyTotp = verifyTotp;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
function generateTotpSecret() {
    const secret = speakeasy_1.default.generateSecret({
        name: 'ServerVault',
    });
    return secret.base32;
}
function generateTotpUri(secret, userEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = speakeasy_1.default.otpauthURL({
            secret: secret,
            label: userEmail,
            issuer: 'ServerVault',
            encoding: 'base32',
        });
        return qrcode_1.default.toDataURL(uri);
    });
}
function verifyTotp(token, secret) {
    return speakeasy_1.default.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1, // Allow for small clock drift
    });
}
