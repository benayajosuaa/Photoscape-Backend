import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { authenticateExpress } from "../middlewares/auth.middleware.js";
const router = Router();
router.use(authenticateExpress);
router.get("/", NotificationController.getMyNotifications);
router.get("/stream", NotificationController.stream);
router.patch("/read-all", NotificationController.markAllNotificationsAsRead);
router.patch("/:notificationId/read", NotificationController.markNotificationAsRead);
export default router;
//# sourceMappingURL=notification.route.js.map