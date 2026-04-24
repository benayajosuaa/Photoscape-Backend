const OTP_TTL_MS = 2 * 60 * 1000; // 2 menit

type OtpRecord = {
  otp: string;
  expiresAt: number;
};

const otpStore = new Map<string, OtpRecord>();

export function generateOTP(email: string) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });

  return otp;
}

export function resendOTP(email: string) {
  const existing = otpStore.get(email);
  const now = Date.now();

  if (existing && now <= existing.expiresAt) {
    const remainingMs = existing.expiresAt - now;
    const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    throw new Error(`OTP masih aktif. Silakan coba lagi dalam ${remainingSeconds} detik.`);
  }

  return generateOTP(email);
}

export function verifyOTP(email: string, inputOtp: string) {
  const data = otpStore.get(email);

  if (!data) return false;
  if (Date.now() > data.expiresAt) return false;
  if (data.otp !== inputOtp) return false;

  otpStore.delete(email);
  return true;
}
