import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';

type User = {
  email: string;
  password: string;
};

type PendingRegistration = {
  email: string;
  password: string;
};

const users: User[] = [];
const pendingRegistrations = new Map<string, PendingRegistration>();

export async function startRegistration(email: string, password: string) {
  const existing = users.find(u => u.email === email);
  if (existing) throw new Error("Email sudah terdaftar");

  const hashed = await bcrypt.hash(password, 10);
  pendingRegistrations.set(email, { email, password: hashed });

  return { email };
}

export function completeRegistration(email: string) {
  const pendingUser = pendingRegistrations.get(email);

  if (!pendingUser) {
    throw new Error("Data registrasi tidak ditemukan. Silakan daftar ulang.");
  }

  const existing = users.find(u => u.email === email);
  if (existing) {
    pendingRegistrations.delete(email);
    throw new Error("Email sudah terdaftar");
  }

  const user: User = {
    email: pendingUser.email,
    password: pendingUser.password,
  };

  users.push(user);
  pendingRegistrations.delete(email);

  return { email };
}

export async function loginUser(email: string, password: string) {
  const user = users.find(u => u.email === email);

  if (!user && pendingRegistrations.has(email)) {
    throw new Error("Email belum terverifikasi. Silakan cek OTP registrasi terlebih dahulu.");
  }

  if (!user) throw new Error("User tidak ditemukan");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Password salah");

  const token = generateToken({ email });

  return { token };
}

export function hasPendingRegistration(email: string) {
  return pendingRegistrations.has(email);
}
