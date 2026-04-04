import { Router } from "express";
import { OperationsReportController } from "../controllers/operations-report.controller.js";
import { authenticateExpress, requireRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateExpress, requireRoles("owner", "manager"));

router.get("/dashboard/summary", OperationsReportController.getDashboardSummary);
router.get("/reports/bookings", OperationsReportController.getBookingReport);
router.get("/reports/studio-usage", OperationsReportController.getStudioUsageReport);
router.get("/reports/payments", OperationsReportController.getPaymentReport);
router.get("/reports/performance", OperationsReportController.getPerformanceReport);
router.get("/reports/admin-activities", OperationsReportController.getAdminActivityReport);

export default router;
