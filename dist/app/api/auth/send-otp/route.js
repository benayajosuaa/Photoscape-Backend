import { resendOTP } from '../../../../services/otp.service.js';
import { sendOTPEmail } from '../../../../utils/mailer.js';
import { validateEmail } from '../../../../utils/validator.js';
import { hasPendingRegistration } from '../../../../services/auth.service.js';
export async function POST(req) {
    const { email } = await req.json();
    if (!validateEmail(email)) {
        return Response.json({ error: "Email tidak valid" }, { status: 400 });
    }
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!hasPendingRegistration(normalizedEmail)) {
        return Response.json({ error: "Tidak ada registrasi pending untuk email ini. Silakan daftar terlebih dahulu." }, { status: 400 });
    }
    try {
        const otp = resendOTP(normalizedEmail);
        await sendOTPEmail(normalizedEmail, otp);
        return Response.json({ message: "OTP dikirim ulang. Silakan cek email anda." }, { status: 200 });
    }
    catch (err) {
        const message = err?.message ?? "Gagal mengirim OTP";
        const status = message.includes("OTP masih aktif") ? 429 : 500;
        return Response.json({ error: message }, { status });
    }
}
//# sourceMappingURL=route.js.map