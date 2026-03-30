import bcrypt from 'bcrypt';
import type { User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';
import { generateToken } from '../utils/jwt.js';
import { prisma } from '../utils/prisma.js';

export const USER_ROLES = ['customer', 'admin', 'manager', 'owner'] as const;
export type UserRole = (typeof USER_ROLES)[number];

type PendingRegistration = {
  name: string;
  email: string;
  password: string;
};

const pendingRegistrations = new Map<string, PendingRegistration>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeUser(user: Pick<PrismaUser, 'createdAt' | 'email' | 'id' | 'name' | 'role'>) {
  return {
    createdAt: user.createdAt,
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role as UserRole,
  };
}

function toPrismaRole(role: UserRole): PrismaUserRole {
  return role as PrismaUserRole;
}

export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export async function startRegistration(name: string, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) throw new Error("Email sudah terdaftar");

  const hashed = await bcrypt.hash(password, 10);
  pendingRegistrations.set(normalizedEmail, { name, email: normalizedEmail, password: hashed });

  return { email: normalizedEmail, name };
}

export async function completeRegistration(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const pendingUser = pendingRegistrations.get(normalizedEmail);

  if (!pendingUser) {
    throw new Error("Data registrasi tidak ditemukan. Silakan daftar ulang.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    pendingRegistrations.delete(normalizedEmail);
    throw new Error("Email sudah terdaftar");
  }

  const user = await prisma.user.create({
    data: {
      email: pendingUser.email,
      name: pendingUser.name,
      password: pendingUser.password,
      role: toPrismaRole('customer'),
    },
  });

  pendingRegistrations.delete(normalizedEmail);

  return sanitizeUser(user);
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user && pendingRegistrations.has(normalizedEmail)) {
    throw new Error("Email belum terverifikasi. Silakan cek OTP registrasi terlebih dahulu.");
  }

  if (!user) throw new Error("User tidak ditemukan");
  if (!user.password) throw new Error("User belum memiliki password");

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

export async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  return user ? sanitizeUser(user) : null;
}

export async function assignUserRole(email: string, role: UserRole) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("User tidak ditemukan");
  }

  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: { role: toPrismaRole(role) },
  });

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
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: name ?? role,
      password: hashed,
      role: toPrismaRole(role),
    },
    create: {
      email: normalizedEmail,
      name: name ?? role,
      password: hashed,
      role: toPrismaRole(role),
    },
  });

  return sanitizeUser(user);
}
