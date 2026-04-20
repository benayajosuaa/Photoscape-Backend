import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
const REFRESH_SECRET = process.env.REFRESH_SECRET_KEY ?? process.env.SECRET_KEY ?? 'SECRET_KEY';
const REFRESH_EXPIRES_IN = (process.env.REFRESH_EXPIRES_IN || '7d');
const refreshStore = new Map();
function decodeExp(token) {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded !== 'string' && typeof decoded.exp === 'number') {
        return decoded.exp * 1000;
    }
    return Date.now() + 7 * 24 * 60 * 60 * 1000;
}
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
function pruneExpired() {
    const now = Date.now();
    for (const [key, expiresAt] of refreshStore.entries()) {
        if (expiresAt <= now) {
            refreshStore.delete(key);
        }
    }
}
export const RefreshTokenServices = {
    issue(payload) {
        const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
        refreshStore.set(hashToken(token), decodeExp(token));
        pruneExpired();
        return token;
    },
    verify(token) {
        pruneExpired();
        const key = hashToken(token);
        const exists = refreshStore.get(key);
        if (!exists || exists <= Date.now()) {
            refreshStore.delete(key);
            throw new Error('Refresh token tidak valid atau sudah expired');
        }
        return jwt.verify(token, REFRESH_SECRET);
    },
    revoke(token) {
        refreshStore.delete(hashToken(token));
    },
    rotate(token, payload) {
        this.revoke(token);
        return this.issue(payload);
    },
};
//# sourceMappingURL=refresh-token.service.js.map