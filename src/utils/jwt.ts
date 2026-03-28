import jwt from 'jsonwebtoken';

const SECRET = "SECRET_KEY";

export function generateToken(payload: any) {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET);
}