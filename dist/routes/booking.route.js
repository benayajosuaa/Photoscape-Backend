import { Router } from "express";
import { BookingController } from "../controllers/booking.controller.js";
import { authenticateExpress } from "../middlewares/auth.middleware.js";
const router = Router();
router.get("/meta", BookingController.getMeta);
router.get("/availability", BookingController.getAvailability);
router.get("/payments/:paymentId/qris", BookingController.showQrisPaymentPage);
router.get("/payments/:paymentId/qris/confirm", BookingController.confirmQrisPaymentPage);
router.post("/payments/:paymentId/qris/confirm", BookingController.confirmQrisPaymentPage);
router.post("/", authenticateExpress, BookingController.createBooking);
router.patch("/:bookingId/cancel", authenticateExpress, BookingController.cancelBooking);
router.get("/:bookingId/summary", authenticateExpress, BookingController.getSummary);
router.post("/:bookingId/payment", authenticateExpress, BookingController.createPayment);
router.post("/:bookingId/payment/confirm", authenticateExpress, BookingController.confirmPayment);
router.get("/:bookingId/ticket", authenticateExpress, BookingController.getTicket);
router.post("/:bookingId/ticket/send-email", authenticateExpress, BookingController.sendTicketInvoiceEmail);
export default router;
//# sourceMappingURL=booking.route.js.map