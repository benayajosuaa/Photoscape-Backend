import { loginController } from '../../../../controllers/auth.controller.js';

export async function POST(req: Request) {
  return loginController(req);
}
