import { Router } from "express";
import { AdminBookingController } from "../controllers/admin-booking.controller.js";
import { authenticateExpress, requireRoles } from "../middlewares/auth.middleware.js";
const router = Router();
router.use(authenticateExpress, requireRoles("owner", "admin", "manager"));
router.get("/", AdminBookingController.getBookings);
router.get("/:bookingId", AdminBookingController.getBookingDetail);
router.get("/:bookingId/logs", AdminBookingController.getBookingLogs);
router.patch("/:bookingId", AdminBookingController.updateBooking);
router.patch("/:bookingId/reschedule", AdminBookingController.rescheduleBooking);
router.patch("/:bookingId/cancel", AdminBookingController.cancelBooking);
router.patch("/:bookingId/status", AdminBookingController.updateBookingStatus);
export default router;
//# sourceMappingURL=admin-booking.route.js.map