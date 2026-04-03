import { verifyToken } from '../utils/jwt.js';
export function extractBearerToken(authHeader) {
    if (!authHeader) {
        throw new Error("No token");
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new Error("Invalid token format");
    }
    return token;
}
export function authenticate(req) {
    const token = extractBearerToken(req.headers.get('authorization'));
    return verifyToken(token);
}
export function authenticateExpress(req, res, next) {
    try {
        const token = extractBearerToken(req.header('authorization') ?? null);
        req.authToken = token;
        req.user = verifyToken(token);
        next();
    }
    catch (error) {
        res.status(401).json({ error: error.message ?? 'Unauthorized' });
    }
}
export function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map