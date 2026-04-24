const OTP_TTL_MS = 2 * 60 * 1000; // 2 menit
const otpStore = new Map();
export function generateOTP(email) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });
    return otp;
}
export function resendOTP(email) {
    const existing = otpStore.get(email);
    const now = Date.now();
    if (existing && now <= existing.expiresAt) {
        const remainingMs = existing.expiresAt - now;
        const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
        throw new Error(`OTP masih aktif. Silakan coba lagi dalam ${remainingSeconds} detik.`);
    }
    return generateOTP(email);
}
export function verifyOTP(email, inputOtp) {
    const data = otpStore.get(email);
    if (!data)
        return false;
    if (Date.now() > data.expiresAt)
        return false;
    if (data.otp !== inputOtp)
        return false;
    otpStore.delete(email);
    return true;
}
//# sourceMappingURL=otp.service.js.map