import { registerController } from '../../../../controller/auth.controller.js';

export async function POST(req: Request) {
  return registerController(req);
}
