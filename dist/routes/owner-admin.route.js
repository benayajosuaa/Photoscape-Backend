import { Router } from 'express';
import { rateLimit } from "express-rate-limit";
import { OwnerAdminController } from '../controllers/owner-admin.controller.js';
import { ContactController } from "../controllers/contact.controller.js";
import { authenticateExpress, requireRoles } from '../middlewares/auth.middleware.js';
const router = Router();
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak request contact. Coba lagi sebentar." },
});
// NOTE: router ini di-mount di `/api` (lihat `src/index.ts`), jadi endpoint publik harus
// didefinisikan sebelum `authenticateExpress` supaya tidak memunculkan error "No token".
router.post("/contact-us", contactLimiter, ContactController.sendMessage);
router.use(authenticateExpress);
router.get('/reports/dashboard', requireRoles('owner', 'manager', 'admin'), OwnerAdminController.getReportsDashboard);
router.get('/reports/revenue', requireRoles('owner', 'manager', 'admin'), OwnerAdminController.getReportsRevenue);
router.get('/reports/bookings', requireRoles('owner', 'manager', 'admin'), OwnerAdminController.getReportsBookings);
router.get('/reports/studio-usage', requireRoles('owner', 'manager', 'admin'), OwnerAdminController.getReportsStudioUsage);
router.get('/dashboard/owner', requireRoles('owner'), OwnerAdminController.getDashboard);
router.get('/users', requireRoles('owner'), OwnerAdminController.getUsers);
router.post('/users', requireRoles('owner'), OwnerAdminController.createUser);
router.patch('/users/:id', requireRoles('owner'), OwnerAdminController.updateUser);
router.patch('/users/:id/reset-password', requireRoles('owner'), OwnerAdminController.resetPassword);
router.patch('/users/:id/status', requireRoles('owner'), OwnerAdminController.setUserStatus);
router.get('/customers', requireRoles('owner', 'admin', 'manager'), OwnerAdminController.getCustomers);
router.get('/customers/:id', requireRoles('owner', 'admin', 'manager'), OwnerAdminController.getCustomerDetail);
router.patch('/customers/:id', requireRoles('owner', 'admin'), OwnerAdminController.updateCustomer);
router.patch('/customers/:id/blacklist', requireRoles('owner', 'admin'), OwnerAdminController.setCustomerBlacklist);
router.get('/transactions', requireRoles('owner', 'admin', 'manager'), OwnerAdminController.getTransactions);
router.patch('/transactions/:id/confirm', requireRoles('owner', 'admin'), OwnerAdminController.confirmTransaction);
router.post('/transactions/:id/refund', requireRoles('owner', 'admin'), OwnerAdminController.requestRefund);
router.get('/transactions/export', requireRoles('owner', 'admin', 'manager'), OwnerAdminController.exportTransactions);
router.get('/logs', requireRoles('owner', 'manager'), OwnerAdminController.getLogs);
router.get('/schedules', requireRoles('owner', 'admin', 'manager'), OwnerAdminController.getSchedules);
router.post('/schedules/block', requireRoles('owner', 'admin'), OwnerAdminController.blockSchedule);
router.delete('/schedules/block/:id', requireRoles('owner', 'admin'), OwnerAdminController.unblockSchedule);
router.patch('/schedules/operational-hours', requireRoles('owner', 'admin'), OwnerAdminController.updateOperationalHours);
export default router;
//# sourceMappingURL=owner-admin.route.js.map