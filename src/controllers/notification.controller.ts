import type { Request, Response } from "express";
import { NotificationServices } from "../services/notification.service.js";

function getAuthenticatedUserId(req: Request) {
  if (!req.user?.userId) {
    throw new Error("Unauthorized");
  }

  return req.user.userId;
}

export const NotificationController = {
  async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const limit = Number(req.query.limit ?? 50);
      const data = await NotificationServices.getUserNotifications(userId, limit);

      return res.status(200).json({
        message: "notifications loaded",
        data,
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to load notifications",
      });
    }
  },

  async markNotificationAsRead(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      const notificationId = String(req.params.notificationId ?? "").trim();

      if (!notificationId) {
        throw new Error("notificationId wajib diisi");
      }

      await NotificationServices.markNotificationAsRead(userId, notificationId);

      return res.status(200).json({
        message: "notification marked as read",
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to update notification",
      });
    }
  },

  async markAllNotificationsAsRead(req: Request, res: Response) {
    try {
      const userId = getAuthenticatedUserId(req);
      await NotificationServices.markAllNotificationsAsRead(userId);

      return res.status(200).json({
        message: "all notifications marked as read",
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({
        message: error.message ?? "failed to update notifications",
      });
    }
  },

  stream(req: Request, res: Response) {
    try {
      if (process.env.VERCEL) {
        return res.status(501).json({
          message: "SSE stream tidak didukung di runtime serverless. Gunakan polling /api/notifications.",
        });
      }

      const userId = getAuthenticatedUserId(req);

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      NotificationServices.subscribe(userId, res);
    } catch (error: any) {
      console.error(error);
      res.status(401).json({
        message: error.message ?? "failed to open notification stream",
      });
    }
  },
};
