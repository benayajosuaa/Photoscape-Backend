import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../services/auth.service.js';
type AuthenticatedUser = {
    email: string;
    locationId?: string | null;
    locationName?: string | null;
    role: UserRole;
    userId: string;
};
declare global {
    namespace Express {
        interface Request {
            authToken?: string;
            user?: AuthenticatedUser;
        }
    }
}
export declare function extractBearerToken(authHeader: string | null): string;
export declare function authenticate(req: globalThis.Request): AuthenticatedUser;
export declare function authenticateExpress(req: Request, res: Response, next: NextFunction): void;
export declare function requireRoles(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=auth.middleware.d.ts.map