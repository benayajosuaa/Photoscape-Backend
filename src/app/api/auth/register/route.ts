import { registerController } from '../../../../controllers/auth.controller.js';

export async function POST(req: Request) {
  return registerController(req);
}
