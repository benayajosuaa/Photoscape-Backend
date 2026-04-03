import { extractBearerToken } from '../middlewares/auth.middleware.js';
import { assignUserRole, completeRegistration, findUserByEmail, hasPendingRegistration, isValidUserRole, loginUser, startRegistration, } from '../services/auth.service.js';
import { generateOTP, verifyOTP } from '../services/otp.service.js';
import { getTokenExpiration, revokeToken, SESSION_DURATION_HOURS } from '../utils/jwt.js';
import { sendOTPEmail } from '../utils/mailer.js';
import { validateEmail } from '../utils/validator.js';
async function handleRegister(name, email, password) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!name || name.trim().length < 2) {
        return {
            body: { error: "Nama minimal 2 karakter" },
            status: 400,
        };
    }
    if (!validateEmail(normalizedEmail)) {
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
        await startRegistration(name.trim(), normalizedEmail, password);
        const otp = generateOTP(normalizedEmail);
        await sendOTPEmail(normalizedEmail, otp);
        return {
            body: {
                email: normalizedEmail,
                name: name.trim(),
                message: "Untuk memastikan email anda terdaftar, tolong check email untuk melihat kode OTP.",
            },
            status: 200,
        };
    }
    catch (err) {
        return {
            body: { error: err.message },
            status: 400,
        };
    }
}
function handleGetCurrentUser(currentUser) {
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
async function handleAssignRole(email, role) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
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
        const user = await assignUserRole(normalizedEmail, role);
        return {
            body: {
                message: "Role user berhasil diperbarui",
                user,
            },
            status: 200,
        };
    }
    catch (err) {
        return {
            body: { error: err.message },
            status: 400,
        };
    }
}
async function handleLogin(email, password) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
        return {
            body: { error: "Email tidak valid" },
            status: 400,
        };
    }
    try {
        const data = await loginUser(normalizedEmail, password);
        return {
            body: {
                ...data,
                session: {
                    expiresAt: getTokenExpiration(data.token),
                    maxAgeHours: SESSION_DURATION_HOURS,
                },
            },
            status: 200,
        };
    }
    catch (err) {
        return {
            body: { error: err.message },
            status: 400,
        };
    }
}
async function handleSendOtp(email) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
        return {
            body: { error: "Email tidak valid" },
            status: 400,
        };
    }
    if (!hasPendingRegistration(normalizedEmail)) {
        return {
            body: { error: "Tidak ada registrasi pending untuk email ini. Silakan daftar terlebih dahulu." },
            status: 400,
        };
    }
    try {
        const otp = generateOTP(normalizedEmail);
        await sendOTPEmail(normalizedEmail, otp);
        return {
            body: { message: "OTP dikirim ulang. Silakan cek email anda." },
            status: 200,
        };
    }
    catch (err) {
        return {
            body: { error: err?.message ?? "Gagal mengirim OTP" },
            status: 500,
        };
    }
}
async function handleVerifyOtp(email, otp) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
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
    const valid = verifyOTP(normalizedEmail, otp);
    if (!valid) {
        return {
            body: { error: "OTP salah / expired" },
            status: 400,
        };
    }
    try {
        await completeRegistration(normalizedEmail);
        return {
            body: { message: "Registrasi sukses" },
            status: 200,
        };
    }
    catch (err) {
        return {
            body: { error: err.message },
            status: 400,
        };
    }
}
function handleLogout(token) {
    if (!token) {
        return {
            body: { error: "No token" },
            status: 401,
        };
    }
    try {
        revokeToken(token);
        return {
            body: { message: "Logout berhasil" },
            status: 200,
        };
    }
    catch (err) {
        return {
            body: { error: err.message ?? "Gagal logout" },
            status: 400,
        };
    }
}
export async function registerController(req) {
    const { name, email, password } = await req.json();
    const result = await handleRegister(name, email, password);
    return Response.json(result.body, { status: result.status });
}
export async function loginController(req) {
    const { email, password } = await req.json();
    const result = await handleLogin(email, password);
    return Response.json(result.body, { status: result.status });
}
export async function sendOtpController(req) {
    const { email } = await req.json();
    const result = await handleSendOtp(email);
    return Response.json(result.body, { status: result.status });
}
export async function verifyOtpController(req) {
    const { email, otp } = await req.json();
    const result = await handleVerifyOtp(email, otp);
    return Response.json(result.body, { status: result.status });
}
export async function logoutController(req) {
    let token = null;
    try {
        token = extractBearerToken(req.headers.get('authorization'));
    }
    catch {
        token = null;
    }
    const result = handleLogout(token);
    return Response.json(result.body, { status: result.status });
}
export async function registerExpressController(req, res) {
    const { name, email, password } = req.body;
    const result = await handleRegister(name, email, password);
    res.status(result.status).json(result.body);
}
export async function loginExpressController(req, res) {
    const { email, password } = req.body;
    const result = await handleLogin(email, password);
    res.status(result.status).json(result.body);
}
export async function sendOtpExpressController(req, res) {
    const { email } = req.body;
    const result = await handleSendOtp(email);
    res.status(result.status).json(result.body);
}
export async function verifyOtpExpressController(req, res) {
    const { email, otp } = req.body;
    const result = await handleVerifyOtp(email, otp);
    res.status(result.status).json(result.body);
}
export function logoutExpressController(req, res) {
    const result = handleLogout(req.authToken ?? null);
    res.status(result.status).json(result.body);
}
export function meExpressController(req, res) {
    const result = handleGetCurrentUser(req.user ?? null);
    res.status(result.status).json(result.body);
}
export async function assignRoleExpressController(req, res) {
    const { email, role } = req.body;
    const result = await handleAssignRole(email, role);
    res.status(result.status).json(result.body);
}
export async function findUserExpressController(req, res) {
    const email = String(req.query.email ?? '').trim().toLowerCase();
    if (!validateEmail(email)) {
        res.status(400).json({ error: "Email tidak valid" });
        return;
    }
    const user = await findUserByEmail(email);
    if (!user) {
        res.status(404).json({ error: "User tidak ditemukan" });
        return;
    }
    res.status(200).json({ user });
}
//# sourceMappingURL=auth.controller.js.map