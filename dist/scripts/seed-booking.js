import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SeedBookingServices } from "../services/seed-booking.service.js";
import { prisma } from "../utils/prisma.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
try {
    const result = await SeedBookingServices.run();
    console.log("Booking seed selesai:", result);
}
catch (error) {
    console.error("Booking seed gagal:", error);
    process.exitCode = 1;
}
finally {
    await prisma.$disconnect();
}
//# sourceMappingURL=seed-booking.js.map