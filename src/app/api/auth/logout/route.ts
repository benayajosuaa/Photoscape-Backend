import { logoutController } from '../../../../controller/auth.controller.js';

export async function POST(req: Request) {
  return logoutController(req);
}
