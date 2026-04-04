import type { Request, Response } from "express";
export declare const NotificationController: {
    getMyNotifications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    markNotificationAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    markAllNotificationsAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    stream(req: Request, res: Response): void;
};
//# sourceMappingURL=notification.controller.d.ts.map