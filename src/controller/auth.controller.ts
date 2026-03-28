import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import {
  assignUserRole,
  completeRegistration,
  findUserByEmail,
  hasPendingRegistration,
  isValidUserRole,
  loginUser,
  startRegistration,
  type UserRole,
} from '../services/auth.service.js';
import { generateOTP, verifyOTP } from '../services/otp.service.js';
import { sendOTPEmail } from '../utils/mailer.js';
import { validateEmail } from '../utils/validator.js';

async function handleRegister(name: string, email: string, password: string) {
  if (!name || name.trim().length < 2) {
    return {
      body: { error: "Nama minimal 2 karakter" },
      status: 400,
    };
  }

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
    await startRegistration(name.trim(), email, password);

    const otp = generateOTP(email);
    await sendOTPEmail(email, otp);

    return {
      body: {
        email,
        name: name.trim(),
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

function handleGetCurrentUser(currentUser: unknown) {
  if (!currentUser || typeof currentUser !== 'object') {
    return {
      body: { error: "User tidak valid" },
      status: 401,
    };
  }

  return {
    body: { user: currentUser },
    status: 200,
  };
}

function handleAssignRole(email: string, role: string) {
  if (!validateEmail(email)) {
    return {
      body: { error: "Email tidak valid" },
      status: 400,
    };
  }

  if (!isValidUserRole(role)) {
    return {
      body: { error: "Role tidak valid" },
      status: 400,
    };
  }

  if (role === 'customer') {
    return {
      body: { error: "Role customer tidak perlu di-assign dari panel admin." },
      status: 400,
    };
  }

  try {
    const user = assignUserRole(email, role as UserRole);
    return {
      body: {
        message: "Role user berhasil diperbarui",
        user,
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
  const { name, email, password } = await req.json();
  const result = await handleRegister(name, email, password);
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
  const { name, email, password } = req.body;
  const result = await handleRegister(name, email, password);
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

export function meExpressController(req: ExpressRequest, res: ExpressResponse) {
  const result = handleGetCurrentUser(req.user ?? null);
  res.status(result.status).json(result.body);
}

export function assignRoleExpressController(req: ExpressRequest, res: ExpressResponse) {
  const { email, role } = req.body;
  const result = handleAssignRole(email, role);
  res.status(result.status).json(result.body);
}

export function findUserExpressController(req: ExpressRequest, res: ExpressResponse) {
  const email = String(req.query.email ?? '');

  if (!validateEmail(email)) {
    res.status(400).json({ error: "Email tidak valid" });
    return;
  }

  const user = findUserByEmail(email);

  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  res.status(200).json({ user });
}
