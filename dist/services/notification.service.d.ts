import { Prisma } from "@prisma/client";
import type { Response } from "express";
export declare const NotificationServices: {
    notifyBookingCreated(bookingId: string): Promise<void>;
    notifyPaymentPending(bookingId: string): Promise<void>;
    notifyPaymentPaid(bookingId: string): Promise<void>;
    notifyPaymentFailed(bookingId: string, reason?: string): Promise<void>;
    notifyBookingReminder(bookingId: string): Promise<void>;
    notifyScheduleChanged(params: {
        actorName?: string | null;
        bookingId: string;
    }): Promise<void>;
    notifyBookingCancelled(params: {
        actorName?: string | null;
        bookingId: string;
        cancelledBy: "admin" | "customer";
        reason?: string | null;
    }): Promise<void>;
    notifyAdminBookingUpdated(params: {
        actorName?: string | null;
        bookingId: string;
        message: string;
        title: string;
    }): Promise<void>;
    getUserNotifications(userId: string, limit?: number): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            userId: string;
            bookingId: string | null;
            message: string;
            type: import(".prisma/client").$Enums.NotificationType;
            title: string;
            metadata: Prisma.JsonValue | null;
            isRead: boolean;
        }[];
        unreadCount: number;
    }>;
    markNotificationAsRead(userId: string, notificationId: string): Promise<Prisma.BatchPayload>;
    markAllNotificationsAsRead(userId: string): Promise<Prisma.BatchPayload>;
    subscribe(userId: string, res: Response): void;
    runReminderDispatch(): Promise<void>;
    startJobs(): void;
};
//# sourceMappingURL=notification.service.d.ts.map