import { verifyToken } from '../utils/jwt.js';

export function authenticate(req: Request) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) throw new Error("No token");

  const token = authHeader.split(' ')[1];
  
  if (!token) throw new Error("Invalid token format");
  
  return verifyToken(token);
}