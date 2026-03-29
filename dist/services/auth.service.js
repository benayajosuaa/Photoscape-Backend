import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';
export const USER_ROLES = ['customer', 'admin', 'manager', 'owner'];
const users = [];
const pendingRegistrations = new Map();
let nextUserId = 1;
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function createUser(params) {
    const user = {
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
function sanitizeUser(user) {
    return {
        createdAt: user.createdAt,
        email: user.email,
        id: user.id,
        name: user.name,
        role: user.role,
    };
}
export function isValidUserRole(role) {
    return USER_ROLES.includes(role);
}
export async function startRegistration(name, email, password) {
    const normalizedEmail = normalizeEmail(email);
    const existing = users.find(u => u.email === normalizedEmail);
    if (existing)
        throw new Error("Email sudah terdaftar");
    const hashed = await bcrypt.hash(password, 10);
    pendingRegistrations.set(normalizedEmail, { name, email: normalizedEmail, password: hashed });
    return { email: normalizedEmail, name };
}
export function completeRegistration(email) {
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
export async function loginUser(email, password) {
    const normalizedEmail = normalizeEmail(email);
    const user = users.find(u => u.email === normalizedEmail);
    if (!user && pendingRegistrations.has(normalizedEmail)) {
        throw new Error("Email belum terverifikasi. Silakan cek OTP registrasi terlebih dahulu.");
    }
    if (!user)
        throw new Error("User tidak ditemukan");
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
        throw new Error("Password salah");
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
export function hasPendingRegistration(email) {
    return pendingRegistrations.has(normalizeEmail(email));
}
export function findUserByEmail(email) {
    const user = users.find(item => item.email === normalizeEmail(email));
    return user ? sanitizeUser(user) : null;
}
export function assignUserRole(email, role) {
    const user = users.find(item => item.email === normalizeEmail(email));
    if (!user) {
        throw new Error("User tidak ditemukan");
    }
    user.role = role;
    return sanitizeUser(user);
}
export async function seedPrivilegedUser(params) {
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
//# sourceMappingURL=auth.service.js.map