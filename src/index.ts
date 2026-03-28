import express from "express";
import type { Request, Response } from "express"
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("halobenaya testing API");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});