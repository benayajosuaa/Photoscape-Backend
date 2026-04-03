import jwt from 'jsonwebtoken';
export declare const SESSION_DURATION_HOURS = 24;
export declare const SESSION_DURATION_MS: number;
export declare function generateToken(payload: any): string;
export declare function verifyToken(token: string): string | jwt.JwtPayload;
export declare function revokeToken(token: string): void;
export declare function getTokenExpiration(token: string): string;
//# sourceMappingURL=jwt.d.ts.map