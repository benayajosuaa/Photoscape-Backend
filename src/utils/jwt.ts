import jwt, { type JwtPayload } from 'jsonwebtoken';

const SECRET = process.env.SECRET_KEY ?? "SECRET_KEY";
export const SESSION_DURATION_HOURS = 24;
export const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;
const SESSION_DURATION = `${SESSION_DURATION_HOURS}h`;
const revokedTokens = new Map<string, number>();

export function generateToken(payload: any) {
  return jwt.sign(payload, SECRET, { expiresIn: SESSION_DURATION });
}

export function verifyToken(token: string) {
  pruneRevokedTokens();

  if (isTokenRevoked(token)) {
    throw new Error("Session sudah logout. Silakan login kembali.");
  }

  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Session expired. Silakan login kembali.");
    }

    throw error;
  }
}

export function revokeToken(token: string) {
  const decoded = jwt.decode(token);
  const expiresAt = getExpirationTimestamp(decoded);

  revokedTokens.set(token, expiresAt);
  pruneRevokedTokens();
}

export function getTokenExpiration(token: string) {
  const decoded = jwt.decode(token);
  const expiresAt = getExpirationTimestamp(decoded);

  return new Date(expiresAt).toISOString();
}

function isTokenRevoked(token: string) {
  const expiresAt = revokedTokens.get(token);

  if (!expiresAt) {
    return false;
  }

  if (expiresAt <= Date.now()) {
    revokedTokens.delete(token);
    return false;
  }

  return true;
}

function getExpirationTimestamp(decoded: string | JwtPayload | null) {
  if (decoded && typeof decoded !== 'string' && typeof decoded.exp === 'number') {
    return decoded.exp * 1000;
  }

  return Date.now() + SESSION_DURATION_MS;
}

function pruneRevokedTokens() {
  const now = Date.now();

  for (const [token, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) {
      revokedTokens.delete(token);
    }
  }
}
