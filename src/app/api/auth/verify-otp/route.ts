import { verifyOTP } from '../../../../services/otp.service.js';

export async function POST(req: Request) {
  const { email, otp } = await req.json();

  const valid = verifyOTP(email, otp);

  if (!valid) {
    return Response.json({ error: "OTP salah / expired" }, { status: 400 });
  }

  return Response.json({ message: "OTP valid" });
}