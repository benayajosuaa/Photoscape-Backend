import { generateOTP } from '../../../../services/otp.service.js';
import { sendOTPEmail } from '../../../../utils/mailer.js';
import { validateEmail } from '../../../../utils/validator.js';

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!validateEmail(email)) {
    return Response.json({ error: "Email tidak valid" }, { status: 400 });
  }

  const otp = generateOTP(email);

  await sendOTPEmail(email, otp);

  return Response.json({ message: "OTP dikirim" });
}