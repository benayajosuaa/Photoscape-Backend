const otpStore = new Map();

export function generateOTP(email: string) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(email, {
    otp,
    expires: Date.now() + 5 * 60 * 1000 // 5 menit
  });

  return otp;
}

export function verifyOTP(email: string, inputOtp: string) {
  const data = otpStore.get(email);

  if (!data) return false;
  if (Date.now() > data.expires) return false;
  if (data.otp !== inputOtp) return false;

  otpStore.delete(email);
  return true;
}