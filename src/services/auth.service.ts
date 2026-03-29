import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';

export const USER_ROLES = ['customer', 'admin', 'manager', 'owner'] as const;
export type UserRole = (typeof USER_ROLES)[number];

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
};

type PendingRegistration = {
  name: string;
  email: string;
  password: string;
};

const users: User[] = [];
const pendingRegistrations = new Map<string, PendingRegistration>();
let nextUserId = 1;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createUser(params: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}) {
  const user: User = {
    id: String(nextUserId++),
    name: params.name,
    email: params.email,
    password: params.password,
    role: params.role,
    createdAt: new Date(),
  };

  users.push(user);
  return user;
}

function sanitizeUser(user: User) {
  return {
    createdAt: user.createdAt,
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role,
  };
}

export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export async function startRegistration(name: string, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = users.find(u => u.email === normalizedEmail);
  if (existing) throw new Error("Email sudah terdaftar");

  const hashed = await bcrypt.hash(password, 10);
  pendingRegistrations.set(normalizedEmail, { name, email: normalizedEmail, password: hashed });

  return { email: normalizedEmail, name };
}

export function completeRegistration(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const pendingUser = pendingRegistrations.get(normalizedEmail);

  if (!pendingUser) {
    throw new Error("Data registrasi tidak ditemukan. Silakan daftar ulang.");
  }

  const existing = users.find(u => u.email === normalizedEmail);
  if (existing) {
    pendingRegistrations.delete(normalizedEmail);
    throw new Error("Email sudah terdaftar");
  }

  const user = createUser({
    email: pendingUser.email,
    name: pendingUser.name,
    password: pendingUser.password,
    role: 'customer',
  });
  pendingRegistrations.delete(normalizedEmail);

  return sanitizeUser(user);
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = users.find(u => u.email === normalizedEmail);

  if (!user && pendingRegistrations.has(normalizedEmail)) {
    throw new Error("Email belum terverifikasi. Silakan cek OTP registrasi terlebih dahulu.");
  }

  if (!user) throw new Error("User tidak ditemukan");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Password salah");

  const token = generateToken({
    email: user.email,
    role: user.role,
    userId: user.id,
  });

  return {
    token,
    user: sanitizeUser(user),
  };
}

export function hasPendingRegistration(email: string) {
  return pendingRegistrations.has(normalizeEmail(email));
}

export function findUserByEmail(email: string) {
  const user = users.find(item => item.email === normalizeEmail(email));
  return user ? sanitizeUser(user) : null;
}

export function assignUserRole(email: string, role: UserRole) {
  const user = users.find(item => item.email === normalizeEmail(email));

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  user.role = role;
  return sanitizeUser(user);
}

export async function seedPrivilegedUser(params: {
  email: string | undefined;
  name: string | undefined;
  password: string | undefined;
  role: UserRole;
}) {
  const { email, name, password, role } = params;

  if (!email || !password) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = users.find(user => user.email === normalizedEmail);
  if (existing) {
    existing.role = role;
    if (name) {
      existing.name = name;
    }
    return sanitizeUser(existing);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = createUser({
    email: normalizedEmail,
    name: name ?? role,
    password: hashed,
    role,
  });

  return sanitizeUser(user);
}
