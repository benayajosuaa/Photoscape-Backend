import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assignRoleExpressController, findUserExpressController, loginExpressController, logoutExpressController, meExpressController, registerExpressController, sendOtpExpressController, verifyOtpExpressController, } from "./controllers/auth.controller.js";
import { authenticateExpress, requireRoles } from "./middlewares/auth.middleware.js";
import adminBookingRoute from "./routes/admin-booking.route.js";
import bookingRoute from "./routes/booking.route.js";
import { seedPrivilegedUser } from "./services/auth.service.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
await seedPrivilegedUser({
    email: process.env.OWNER_EMAIL,
    name: process.env.OWNER_NAME ?? 'Owner',
    password: process.env.OWNER_PASSWORD,
    role: 'owner',
});
await seedPrivilegedUser({
    email: process.env.ADMIN_EMAIL,
    name: process.env.ADMIN_NAME ?? 'Admin',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
});
await seedPrivilegedUser({
    email: process.env.MANAGER_EMAIL,
    name: process.env.MANAGER_NAME ?? 'Manager',
    password: process.env.MANAGER_PASSWORD,
    role: 'manager',
});
const app = express();
// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.post("/api/auth/register", registerExpressController);
app.post("/api/auth/login", loginExpressController);
app.post("/api/auth/logout", authenticateExpress, logoutExpressController);
app.post("/api/auth/send-otp", sendOtpExpressController);
app.post("/api/auth/verify-otp", verifyOtpExpressController);
app.get("/api/auth/me", authenticateExpress, meExpressController);
app.get("/api/admin/users/find", authenticateExpress, requireRoles("owner", "admin", "manager"), findUserExpressController);
app.patch("/api/admin/users/role", authenticateExpress, requireRoles("owner"), assignRoleExpressController);
app.use("/api/admin/bookings", adminBookingRoute);
app.use("/api/bookings", bookingRoute);
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