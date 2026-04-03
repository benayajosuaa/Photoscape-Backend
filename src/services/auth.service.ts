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

type SanitizedUserInput = Pick<PrismaUser, 'createdAt' | 'email' | 'id' | 'name' | 'role' | 'locationId'> & {
  location?: {
    id: string;
    name: string;
  } | null;
};

async function findOrCreateLocationByName(name: string) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Nama lokasi admin tidak valid");
  }

  const existing = await prisma.location.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.location.create({
    data: {
      name: normalizedName,
    },
  });
}

function sanitizeUser(user: SanitizedUserInput) {
  return {
    createdAt: user.createdAt,
    email: user.email,
    id: user.id,
    location: user.location
      ? {
          id: user.location.id,
          name: user.location.name,
        }
      : null,
    locationId: user.locationId ?? null,
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
    include: {
      location: true,
    },
  });

  pendingRegistrations.delete(normalizedEmail);

  return sanitizeUser(user);
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      location: true,
    },
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
    locationId: user.locationId ?? null,
    locationName: user.location?.name ?? null,
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
    include: {
      location: true,
    },
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
    include: {
      location: true,
    },
  });

  return sanitizeUser(user);
}

export async function seedPrivilegedUser(params: {
  email: string | undefined;
  locationName?: string | undefined;
  name: string | undefined;
  password: string | undefined;
  role: UserRole;
}) {
  const { email, locationName, name, password, role } = params;

  if (!email || !password) {
    return null;
  }

  const location =
    role === 'owner' || !locationName
      ? null
      : await findOrCreateLocationByName(locationName);

  const normalizedEmail = normalizeEmail(email);
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      locationId: location?.id ?? null,
      name: name ?? role,
      password: hashed,
      role: toPrismaRole(role),
    },
    create: {
      email: normalizedEmail,
      locationId: location?.id ?? null,
      name: name ?? role,
      password: hashed,
      role: toPrismaRole(role),
    },
    include: {
      location: true,
    },
  });

  return sanitizeUser(user);
}
