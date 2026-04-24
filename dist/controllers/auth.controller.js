import { extractBearerToken } from '../middlewares/auth.middleware.js';
import { assignUserRole, completeRegistration, findUserByEmail, findUserById, hasPendingRegistration, isValidUserRole, loginUser, startRegistration, } from '../services/auth.service.js';
import { AuditLogServices } from '../services/audit-log.service.js';
import { RefreshTokenServices } from '../services/refresh-token.service.js';
import { generateOTP, resendOTP, verifyOTP } from '../services/otp.service.js';
import { generateToken, getTokenExpiration, revokeToken, SESSION_DURATION_HOURS } from '../utils/jwt.js';
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
async function handleGetCurrentUser(currentUser) {
    if (!currentUser || typeof currentUser !== 'object' || !currentUser.userId) {
        return {
            body: { error: "User tidak valid" },
            status: 401,
        };
    }
    const user = await findUserById(currentUser.userId);
    if (!user) {
        return {
            body: { error: "User tidak ditemukan" },
            status: 404,
        };
    }
    return {
        body: { user },
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
        const refreshToken = RefreshTokenServices.issue({
            email: data.user.email,
            role: data.user.role,
            userId: data.user.id,
            locationId: data.user.locationId ?? null,
            locationName: data.user.location?.name ?? null,
        });
        return {
            body: {
                ...data,
                refreshToken,
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
async function handleRefresh(refreshToken) {
    if (!refreshToken) {
        return {
            body: { error: 'Refresh token wajib diisi' },
            status: 400,
        };
    }
    try {
        const payload = RefreshTokenServices.verify(refreshToken);
        const nextAccessToken = generateToken({
            email: payload.email,
            locationId: payload.locationId ?? null,
            locationName: payload.locationName ?? null,
            role: payload.role,
            userId: payload.userId,
        });
        const nextRefreshToken = RefreshTokenServices.rotate(refreshToken, payload);
        return {
            body: {
                token: nextAccessToken,
                refreshToken: nextRefreshToken,
                session: {
                    expiresAt: getTokenExpiration(nextAccessToken),
                    maxAgeHours: SESSION_DURATION_HOURS,
                },
            },
            status: 200,
        };
    }
    catch (error) {
        return {
            body: { error: error?.message ?? 'Refresh token tidak valid' },
            status: 401,
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
        const otp = resendOTP(normalizedEmail);
        await sendOTPEmail(normalizedEmail, otp);
        return {
            body: { message: "OTP dikirim ulang. Silakan cek email anda." },
            status: 200,
        };
    }
    catch (err) {
        return {
            body: { error: err?.message ?? "Gagal mengirim OTP" },
            status: err?.message?.includes("OTP masih aktif") ? 429 : 500,
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
function handleLogout(token, refreshToken) {
    if (!token) {
        return {
            body: { error: "No token" },
            status: 401,
        };
    }
    try {
        revokeToken(token);
        if (refreshToken) {
            RefreshTokenServices.revoke(refreshToken);
        }
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
    let refreshToken = null;
    try {
        const body = await req.json();
        refreshToken = String(body?.refreshToken ?? '').trim() || null;
    }
    catch {
        refreshToken = null;
    }
    const result = handleLogout(token, refreshToken);
    return Response.json(result.body, { status: result.status });
}
export async function refreshController(req) {
    let refreshToken = '';
    try {
        const body = await req.json();
        refreshToken = String(body?.refreshToken ?? '').trim();
    }
    catch {
        refreshToken = '';
    }
    const result = await handleRefresh(refreshToken);
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
    const refreshToken = String(req.body?.refreshToken ?? '').trim() || null;
    const result = handleLogout(req.authToken ?? null, refreshToken);
    void AuditLogServices.write({
        action: 'auth.logout',
        entityType: 'auth',
        entityId: req.user?.userId ?? 'anonymous',
        userId: req.user?.userId ?? null,
    });
    res.status(result.status).json(result.body);
}
export async function refreshExpressController(req, res) {
    const refreshToken = String(req.body?.refreshToken ?? '').trim();
    const result = await handleRefresh(refreshToken);
    res.status(result.status).json(result.body);
}
export async function meExpressController(req, res) {
    const result = await handleGetCurrentUser(req.user ?? null);
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