import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loginExpressController,
  registerExpressController,
  sendOtpExpressController,
  verifyOtpExpressController,
} from "./controller/auth.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.post("/api/auth/send-otp", sendOtpExpressController);
app.post("/api/auth/verify-otp", verifyOtpExpressController);

// Serverless
export default app;

// Local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8080;

  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
}
