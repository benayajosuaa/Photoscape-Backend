import express from "express";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assignRoleExpressController, findUserExpressController, loginExpressController, logoutExpressController, meExpressController, registerExpressController, sendOtpExpressController, verifyOtpExpressController, refreshExpressController, } from "./controllers/auth.controller.js";
import { authenticateExpress, requireRoles } from "./middlewares/auth.middleware.js";
import adminBookingRoute from "./routes/admin-booking.route.js";
import bookingRoute from "./routes/booking.route.js";
import managerRoute from "./routes/manager.route.js";
import notificationRoute from "./routes/notification.route.js";
import ownerAdminRoute from "./routes/owner-admin.route.js";
import operationsReportRoute from "./routes/operations-report.route.js";
import { seedPrivilegedUser } from "./services/auth.service.js";
import { NotificationServices } from "./services/notification.service.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercelRuntime = Boolean(process.env.VERCEL);
if (!isVercelRuntime) {
    dotenv.config({ path: path.resolve(__dirname, "../.env") });
}
async function seedPrivilegedUsersSafe() {
    const medanAdminEmail = process.env.ADMIN_EMAIL_MEDAN ?? process.env.ADMIN_EMAIL;
    const medanAdminPassword = process.env.ADMIN_PASSWORD_MEDAN ?? process.env.ADMIN_PASSWORD;
    const medanAdminName = process.env.ADMIN_NAME_MEDAN ?? process.env.ADMIN_NAME ?? "Admin Medan";
    const medanAdminLocation = process.env.ADMIN_LOCATION_MEDAN ?? process.env.ADMIN_LOCATION ?? "Medan";
    const seedConfigs = [
        {
            email: process.env.OWNER_EMAIL,
            locationName: undefined,
            name: process.env.OWNER_NAME ?? "Owner",
            password: process.env.OWNER_PASSWORD,
            role: "owner",
        },
        {
            email: medanAdminEmail,
            locationName: medanAdminLocation,
            name: medanAdminName,
            password: medanAdminPassword,
            role: "admin",
        },
        {
            email: process.env.ADMIN_EMAIL_JAKARTA,
            locationName: process.env.ADMIN_LOCATION_JAKARTA ?? "Jakarta",
            name: process.env.ADMIN_NAME_JAKARTA ?? "Admin Jakarta",
            password: process.env.ADMIN_PASSWORD_JAKARTA,
            role: "admin",
        },
        {
            email: process.env.ADMIN_EMAIL_SURABAYA,
            locationName: process.env.ADMIN_LOCATION_SURABAYA ?? "Surabaya",
            name: process.env.ADMIN_NAME_SURABAYA ?? "Admin Surabaya",
            password: process.env.ADMIN_PASSWORD_SURABAYA,
            role: "admin",
        },
        {
            email: process.env.MANAGER_EMAIL,
            locationName: process.env.MANAGER_LOCATION,
            name: process.env.MANAGER_NAME ?? "Manager",
            password: process.env.MANAGER_PASSWORD,
            role: "manager",
        },
    ];
    for (const config of seedConfigs) {
        try {
            await seedPrivilegedUser(config);
        }
        catch (error) {
            console.error(`[startup] gagal seed user role=${config.role} email=${config.email ?? "-"}:`, error);
            console.warn("[startup] lanjut boot tanpa menghentikan server.");
            break;
        }
    }
}
const app = express();
app.set("trust proxy", 1);
// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((_, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak request login. Coba lagi sebentar." },
});
app.use((req, res, next) => {
    const requestOrigin = req.header("origin") ?? "";
    const configuredOrigins = (process.env.FRONTEND_URL ?? "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    const fallbackOrigins = ["http://localhost:3000"];
    const vercelPreviewOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
    const allowedOrigins = new Set([...configuredOrigins, ...fallbackOrigins, vercelPreviewOrigin].filter(Boolean));
    const resolvedOrigin = requestOrigin && allowedOrigins.has(requestOrigin)
        ? requestOrigin
        : configuredOrigins[0] || fallbackOrigins[0] || "";
    if (resolvedOrigin) {
        res.header("Access-Control-Allow-Origin", resolvedOrigin);
    }
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    return next();
});
// health check / root
app.get("/", (req, res) => {
    res.status(200).json({
        message: "halobenaya testing API",
        env: process.env.NODE_ENV || "development",
    });
});
// OPTIONAL: route example (biar scalable nanti)
app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "API working properly" });
});
app.get("/api/internal/reminder-dispatch", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
    const authHeader = req.header("authorization") ?? "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    const isVercelCron = req.header("x-vercel-cron") === "1";
    if (cronSecret) {
        if (bearerToken !== cronSecret) {
            return res.status(401).json({ message: "Unauthorized cron request" });
        }
    }
    else if (isVercelRuntime && !isVercelCron) {
        return res.status(401).json({ message: "Unauthorized cron request" });
    }
    try {
        await NotificationServices.runReminderDispatch();
        return res.status(200).json({ ok: true, job: "reminder-dispatch" });
    }
    catch (error) {
        console.error("manual reminder dispatch failed", error);
        return res.status(500).json({ message: error?.message ?? "reminder dispatch failed" });
    }
});
app.post("/api/auth/register", registerExpressController);
app.post("/api/auth/login", authLimiter, loginExpressController);
app.post("/api/auth/logout", authenticateExpress, logoutExpressController);
app.post("/api/auth/refresh", refreshExpressController);
app.post("/api/auth/send-otp", sendOtpExpressController);
app.post("/api/auth/verify-otp", verifyOtpExpressController);
app.get("/api/auth/me", authenticateExpress, meExpressController);
app.get("/api/admin/users/find", authenticateExpress, requireRoles("owner", "admin", "manager"), findUserExpressController);
app.patch("/api/admin/users/role", authenticateExpress, requireRoles("owner"), assignRoleExpressController);
app.use("/api/admin/bookings", adminBookingRoute);
app.use("/api/admin", operationsReportRoute);
app.use("/api/manager", managerRoute);
app.use("/api/bookings", bookingRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api", ownerAdminRoute);
const shouldRunStartupJobs = !isVercelRuntime && process.env.DISABLE_STARTUP_JOBS !== "true";
const shouldRunStartupSeed = !isVercelRuntime && process.env.DISABLE_STARTUP_SEED !== "true";
if (shouldRunStartupJobs) {
    NotificationServices.startJobs();
}
if (shouldRunStartupSeed) {
    void seedPrivilegedUsersSafe();
}
// Serverless
export default app;
// Local
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`🚀 Local server running at http://localhost:${PORT}`);
    });
}
//# sourceMappingURL=index.js.map