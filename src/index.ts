import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health check / root
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "halobenaya testing API",
    env: process.env.NODE_ENV || "development",
  });
});

// OPTIONAL: route example (biar scalable nanti)
app.get("/api/test", (req: Request, res: Response) => {
  res.json({ success: true, message: "API working properly" });
});

// Serverless
export default app;

// Local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8080;

  app.listen(PORT, () => {
    console.log(`🚀 Local server running at http://localhost:${PORT}`);
  });
}