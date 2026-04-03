import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../services/auth.service.js';
import { verifyToken } from '../utils/jwt.js';

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

export function extractBearerToken(authHeader: string | null) {
  if (!authHeader) {
    throw new Error("No token");
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new Error("Invalid token format");
  }

  return token;
}

export function authenticate(req: globalThis.Request) {
  const token = extractBearerToken(req.headers.get('authorization'));
  return verifyToken(token) as AuthenticatedUser;
}


export function authenticateExpress(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.header('authorization') ?? null);
    req.authToken = token;
    req.user = verifyToken(token) as AuthenticatedUser;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message ?? 'Unauthorized' });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
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
