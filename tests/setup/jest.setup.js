import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "./test.env"), quiet: true });

process.env.NODE_ENV = "test";
process.env.DISABLE_STARTUP_JOBS = "true";
process.env.DISABLE_STARTUP_SEED = "true";
process.env.TZ = "UTC";
