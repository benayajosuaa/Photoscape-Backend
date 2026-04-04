import { Router } from "express";
import { AdminBookingController } from "../controllers/admin-booking.controller.js";
import { authenticateExpress, requireRoles } from "../middlewares/auth.middleware.js";
const router = Router();
router.use(authenticateExpress);
router.get("/", requireRoles("owner", "admin", "manager"), AdminBookingController.getBookings);
router.get("/:bookingId", requireRoles("owner", "admin", "manager"), AdminBookingController.getBookingDetail);
router.get("/:bookingId/logs", requireRoles("owner", "admin", "manager"), AdminBookingController.getBookingLogs);
router.patch("/:bookingId", requireRoles("owner", "admin"), AdminBookingController.updateBooking);
router.patch("/:bookingId/reschedule", requireRoles("owner", "admin"), AdminBookingController.rescheduleBooking);
router.patch("/:bookingId/cancel", requireRoles("owner", "admin"), AdminBookingController.cancelBooking);
router.patch("/:bookingId/status", requireRoles("owner", "admin"), AdminBookingController.updateBookingStatus);
export default router;
//# sourceMappingURL=admin-booking.route.js.map