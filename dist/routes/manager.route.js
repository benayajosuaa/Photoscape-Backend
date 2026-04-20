import { Router } from 'express';
import { ManagerReportController } from '../controllers/manager-report.controller.js';
import { authenticateExpress, requireRoles } from '../middlewares/auth.middleware.js';
const router = Router();
router.use(authenticateExpress, requireRoles('manager'));
router.get('/filters/options', ManagerReportController.getFilterOptions);
router.get('/summary/daily', ManagerReportController.getDailySummary);
router.get('/bookings', ManagerReportController.getBookings);
router.get('/studio-usage', ManagerReportController.getStudioUsage);
router.get('/transactions', ManagerReportController.getTransactions);
router.get('/activity-logs', ManagerReportController.getActivityLogs);
router.get('/performance', ManagerReportController.getPerformance);
export default router;
//# sourceMappingURL=manager.route.js.map