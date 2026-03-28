import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import {
  completeRegistration,
  hasPendingRegistration,
  loginUser,
  startRegistration,
} from '../services/auth.service.js';
import { generateOTP, verifyOTP } from '../services/otp.service.js';
import { sendOTPEmail } from '../utils/mailer.js';
import { validateEmail } from '../utils/validator.js';

async function handleRegister(email: string, password: string) {
  if (!validateEmail(email)) {
    return {
      body: { error: "Email tidak valid" },
      status: 400,
    };
  }

  if (!password || password.length < 6) {
    return {
      body: { error: "Password minimal 6 karakter" },
      status: 400,
    };
  }

  try {
    await startRegistration(email, password);

    const otp = generateOTP(email);
    await sendOTPEmail(email, otp);

    return {
      body: {
        email,
        message: "Untuk memastikan email anda terdaftar, tolong check email untuk melihat kode OTP.",
      },
      status: 200,
    };
  } catch (err: any) {
    return {
      body: { error: err.message },
      status: 400,
    };
  }
}

async function handleLogin(email: string, password: string) {
  if (!validateEmail(email)) {
    return {
      body: { error: "Email tidak valid" },
      status: 400,
    };
  }

  try {
    const data = await loginUser(email, password);
    return { body: data, status: 200 };
  } catch (err: any) {
    return {
      body: { error: err.message },
      status: 400,
    };
  }
}

async function handleSendOtp(email: string) {
  if (!validateEmail(email)) {
    return {
      body: { error: "Email tidak valid" },
      status: 400,
    };
  }

  if (!hasPendingRegistration(email)) {
    return {
      body: { error: "Tidak ada registrasi pending untuk email ini. Silakan daftar terlebih dahulu." },
      status: 400,
    };
  }

  try {
    const otp = generateOTP(email);
    await sendOTPEmail(email, otp);
    return {
      body: { message: "OTP dikirim ulang. Silakan cek email anda." },
      status: 200,
    };
  } catch (err: any) {
    return {
      body: { error: err?.message ?? "Gagal mengirim OTP" },
      status: 500,
    };
  }
}

function handleVerifyOtp(email: string, otp: string) {
  if (!validateEmail(email)) {
    return {
      body: { error: "Email tidak valid" },
      status: 400,
    };
  }

  if (!otp) {
    return {
      body: { error: "OTP wajib diisi" },
      status: 400,
    };
  }

  const valid = verifyOTP(email, otp);

  if (!valid) {
    return {
      body: { error: "OTP salah / expired" },
      status: 400,
    };
  }

  try {
    completeRegistration(email);
    return {
      body: { message: "Registrasi sukses" },
      status: 200,
    };
  } catch (err: any) {
    return {
      body: { error: err.message },
      status: 400,
    };
  }
}

export async function registerController(req: Request) {
  const { email, password } = await req.json();
  const result = await handleRegister(email, password);
  return Response.json(result.body, { status: result.status });
}

export async function loginController(req: Request) {
  const { email, password } = await req.json();
  const result = await handleLogin(email, password);
  return Response.json(result.body, { status: result.status });
}

export async function sendOtpController(req: Request) {
  const { email } = await req.json();
  const result = await handleSendOtp(email);
  return Response.json(result.body, { status: result.status });
}

export async function verifyOtpController(req: Request) {
  const { email, otp } = await req.json();
  const result = handleVerifyOtp(email, otp);
  return Response.json(result.body, { status: result.status });
}

export async function registerExpressController(req: ExpressRequest, res: ExpressResponse) {
  const { email, password } = req.body;
  const result = await handleRegister(email, password);
  res.status(result.status).json(result.body);
}

export async function loginExpressController(req: ExpressRequest, res: ExpressResponse) {
  const { email, password } = req.body;
  const result = await handleLogin(email, password);
  res.status(result.status).json(result.body);
}

export async function sendOtpExpressController(req: ExpressRequest, res: ExpressResponse) {
  const { email } = req.body;
  const result = await handleSendOtp(email);
  res.status(result.status).json(result.body);
}

export async function verifyOtpExpressController(req: ExpressRequest, res: ExpressResponse) {
  const { email, otp } = req.body;
  const result = handleVerifyOtp(email, otp);
  res.status(result.status).json(result.body);
}
