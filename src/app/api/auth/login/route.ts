import { loginController } from '../../../../controller/auth.controller.js';

export async function POST(req: Request) {
  return loginController(req);
}
