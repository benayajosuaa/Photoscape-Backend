import { authenticate } from '../../../middlewares/auth.middleware.js';

export async function GET(req: Request) {
  try {
    const user = authenticate(req);
    return Response.json({ user });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}