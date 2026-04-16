import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assignRoleExpressController, findUserExpressController, loginExpressController, logoutExpressController, meExpressController, registerExpressController, sendOtpExpressController, verifyOtpExpressController,
} from "./controllers/auth.controller.js";
import { authenticateExpress, requireRoles } from "./middlewares/auth.middleware.js";
import adminBookingRoute from "./routes/admin-booking.route.js";
import bookingRoute from "./routes/booking.route.js";
import notificationRoute from "./routes/notification.route.js";
import operationsReportRoute from "./routes/operations-report.route.js";
import { seedPrivilegedUser } from "./services/auth.service.js";
import { NotificationServices } from "./services/notification.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

await seedPrivilegedUser({
  email: process.env.OWNER_EMAIL,
  locationName: undefined,
  name: process.env.OWNER_NAME ?? 'Owner',
  password: process.env.OWNER_PASSWORD,
  role: 'owner',
});

await seedPrivilegedUser({
  email: process.env.ADMIN_EMAIL,
  locationName: process.env.ADMIN_LOCATION ?? 'Medan',
  name: process.env.ADMIN_NAME ?? 'Admin',
  password: process.env.ADMIN_PASSWORD,
  role: 'admin',
});

await seedPrivilegedUser({
  email: process.env.ADMIN_EMAIL_JAKARTA,
  locationName: process.env.ADMIN_LOCATION_JAKARTA ?? 'Jakarta',
  name: process.env.ADMIN_NAME_JAKARTA ?? 'Admin Jakarta',
  password: process.env.ADMIN_PASSWORD_JAKARTA,
  role: 'admin',
});

await seedPrivilegedUser({
  email: process.env.ADMIN_EMAIL_SURABAYA,
  locationName: process.env.ADMIN_LOCATION_SURABAYA ?? 'Surabaya',
  name: process.env.ADMIN_NAME_SURABAYA ?? 'Admin Surabaya',
  password: process.env.ADMIN_PASSWORD_SURABAYA,
  role: 'admin',
});

await seedPrivilegedUser({
  email: process.env.MANAGER_EMAIL,
  locationName: process.env.MANAGER_LOCATION,
  name: process.env.MANAGER_NAME ?? 'Manager',
  password: process.env.MANAGER_PASSWORD,
  role: 'manager',
});

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: ExpressRequest, res: ExpressResponse, next) => {
  const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// health check / root
app.get("/", (req: ExpressRequest, res: ExpressResponse) => {
  res.status(200).json({
    message: "halobenaya testing API",
    env: process.env.NODE_ENV || "development",
  });
});

// OPTIONAL: route example (biar scalable nanti)
app.get("/api/test", (req: ExpressRequest, res: ExpressResponse) => {
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
app.use("/api/admin", operationsReportRoute);
app.use("/api/bookings", bookingRoute);
app.use("/api/notifications", notificationRoute);

NotificationServices.startJobs();

// Serverless
export default app;

// Local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8080;

  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
}
