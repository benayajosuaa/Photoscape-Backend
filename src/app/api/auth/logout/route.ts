import { logoutController } from '../../../../controllers/auth.controller.js';

export async function POST(req: Request) {
  return logoutController(req);
}
