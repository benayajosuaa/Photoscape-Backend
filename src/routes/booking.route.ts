import { Router } from "express";
import { BookingController } from "../controllers/booking.controller.js";
import { authenticateExpress, requireRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/meta", BookingController.getMeta);
router.get("/availability", BookingController.getAvailability);
router.get("/payments/:paymentId/qris", BookingController.showQrisPaymentPage);
router.post("/payments/:paymentId/qris/confirm", BookingController.confirmQrisPaymentPage);

router.get(
  "/admin/bookings",
  authenticateExpress,
  requireRoles("admin", "manager", "owner"),
  BookingController.getAdminBookings
);
router.get(
  "/admin/bookings/:bookingId",
  authenticateExpress,
  requireRoles("admin", "manager", "owner"),
  BookingController.getAdminBookingDetail
);
router.get(
  "/admin/audit-logs",
  authenticateExpress,
  requireRoles("admin", "manager", "owner"),
  BookingController.getAdminAuditLogs
);
router.get(
  "/admin/reports/revenue",
  authenticateExpress,
  requireRoles("admin", "manager", "owner"),
  BookingController.getAdminRevenueReport
);
router.patch(
  "/admin/bookings/:bookingId/reschedule",
  authenticateExpress,
  requireRoles("admin", "owner"),
  BookingController.rescheduleAdminBooking
);
router.patch(
  "/admin/bookings/:bookingId/cancel",
  authenticateExpress,
  requireRoles("admin", "owner"),
  BookingController.cancelAdminBooking
);

router.post("/", authenticateExpress, BookingController.createBooking);
router.get("/:bookingId/summary", authenticateExpress, BookingController.getSummary);
router.post("/:bookingId/payment", authenticateExpress, BookingController.createPayment);
router.post("/:bookingId/payment/confirm", authenticateExpress, BookingController.confirmPayment);
router.get("/:bookingId/ticket", authenticateExpress, BookingController.getTicket);

export default router;
