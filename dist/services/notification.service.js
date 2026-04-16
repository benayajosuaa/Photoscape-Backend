import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { sendEmail } from "../utils/mailer.js";
const STREAM_HEARTBEAT_MS = 15000;
const NOTIFICATION_JOB_INTERVAL_MS = Number(process.env.NOTIFICATION_JOB_INTERVAL_MS ?? 30000);
const REMINDER_LEAD_MINUTES = Number(process.env.NOTIFICATION_REMINDER_MINUTES ?? 60);
const sseClients = new Map();
let notificationJobsStarted = false;
let notificationJobsSuspendedDueToDb = false;
function formatDateTime(value) {
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    }).format(value);
}
function formatMoney(value) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}
function isMailConfigured() {
    return Boolean(process.env.MAIL_USER && process.env.MAIL_APP_PASSWORD);
}
function isDatabaseConnectionError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return (message.includes("Can't reach database server") ||
        message.includes("P1001") ||
        message.includes("ENOTFOUND") ||
        message.includes("ECONNREFUSED") ||
        message.includes("ETIMEDOUT"));
}
function emitNotification(notification) {
    const clients = sseClients.get(notification.userId);
    if (!clients || clients.size === 0) {
        return;
    }
    const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
    for (const client of clients) {
        client.write(payload);
    }
}
async function createNotifications(payloads) {
    if (payloads.length === 0) {
        return [];
    }
    const notifications = await prisma.$transaction(payloads.map(payload => prisma.notification.create({
        data: {
            bookingId: payload.bookingId ?? null,
            isRead: false,
            message: payload.message,
            metadata: payload.metadata ?? Prisma.JsonNull,
            title: payload.title,
            type: payload.type,
            userId: payload.userId,
        },
    })));
    for (const notification of notifications) {
        emitNotification(notification);
    }
    return notifications;
}
async function loadBookingNotificationContext(bookingId) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            user: true,
            creator: true,
            location: true,
            package: true,
            payment: true,
            addOns: {
                include: {
                    addOn: true,
                },
            },
            schedule: {
                include: {
                    studio: true,
                },
            },
        },
    });
    if (!booking) {
        throw new Error("Booking tidak ditemukan");
    }
    return booking;
}
async function getAdminRecipients(locationId, excludeUserIds = []) {
    const users = await prisma.user.findMany({
        where: {
            role: {
                in: ["owner", "manager", "admin"],
            },
            OR: [{ role: "owner" }, { locationId }],
            id: {
                notIn: excludeUserIds,
            },
        },
        select: {
            id: true,
            role: true,
            locationId: true,
            email: true,
            name: true,
        },
    });
    return users;
}
async function notifyAdmins(params) {
    const admins = await getAdminRecipients(params.locationId, params.excludeUserIds ?? []);
    await createNotifications(admins.map(admin => ({
        bookingId: params.bookingId,
        message: params.message,
        metadata: params.metadata,
        title: params.title,
        type: "admin_alert",
        userId: admin.id,
    })));
}
async function sendCustomerEmail(user, params) {
    if (!user || !isMailConfigured()) {
        return;
    }
    await sendEmail({
        html: params.html,
        subject: params.subject,
        text: params.text,
        to: user.email,
    });
}
function buildCustomerEmailHtml(params) {
    return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.heading}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f1ea;font-family:Arial,sans-serif;color:#183153;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px;box-shadow:0 14px 32px rgba(24,49,83,0.10);">
    <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#183153;color:#fff;font-weight:700;font-size:12px;">Photoscape</div>
    <h1 style="margin:18px 0 14px;font-size:28px;line-height:1.25;">${params.heading}</h1>
    ${params.lines.map(line => `<p style="margin:0 0 12px;line-height:1.7;color:#41556f;">${line}</p>`).join("")}
    ${params.cta ? `<p style="margin-top:20px;font-weight:700;color:#183153;">${params.cta}</p>` : ""}
  </div>
</body>
</html>`;
}
function buildBookingMetadata(booking, extra) {
    return {
        bookingCode: booking.bookingCode,
        bookingId: booking.id,
        locationId: booking.locationId,
        locationName: booking.location.name,
        packageName: booking.package.name,
        paymentId: booking.payment?.id ?? null,
        paymentStatus: booking.payment?.status ?? null,
        scheduleId: booking.schedule.id,
        startTime: booking.schedule.startTime.toISOString(),
        status: booking.status,
        studioName: booking.schedule.studio.name,
        userId: booking.userId ?? null,
        ...extra,
    };
}
async function createCustomerNotification(booking, params) {
    if (!booking.userId) {
        return [];
    }
    const notifications = await createNotifications([
        {
            bookingId: booking.id,
            message: params.message,
            metadata: params.metadata ?? buildBookingMetadata(booking),
            title: params.title,
            type: params.type,
            userId: booking.userId,
        },
    ]);
    await sendCustomerEmail(booking.user, {
        html: params.emailHtml,
        subject: params.emailSubject,
        text: params.emailText,
    });
    return notifications;
}
async function hasReminderBeenSent(bookingId, userId) {
    const existing = await prisma.notification.findFirst({
        where: {
            bookingId,
            type: "booking_reminder",
            userId,
        },
        select: { id: true },
    });
    return Boolean(existing);
}
export const NotificationServices = {
    async notifyBookingCreated(bookingId) {
        const booking = await loadBookingNotificationContext(bookingId);
        const scheduleLabel = formatDateTime(booking.schedule.startTime);
        const message = `Booking ${booking.bookingCode} berhasil dibuat untuk ${scheduleLabel} di ${booking.location.name}.`;
        await createCustomerNotification(booking, {
            emailHtml: buildCustomerEmailHtml({
                heading: "Booking Berhasil Dibuat",
                lines: [
                    `Halo ${booking.user?.name ?? booking.customerName}, booking ${booking.bookingCode} sudah kami terima.`,
                    `Jadwal pemotretan Anda pada ${scheduleLabel} di studio ${booking.schedule.studio.name}, ${booking.location.name}.`,
                    `Total tagihan saat ini ${formatMoney(booking.totalPrice)}.`,
                ],
                cta: "Silakan lanjutkan pembayaran agar booking segera terkonfirmasi.",
            }),
            emailSubject: "Konfirmasi Booking Photoscape",
            emailText: [
                `Booking ${booking.bookingCode} berhasil dibuat.`,
                `Jadwal: ${scheduleLabel}`,
                `Lokasi: ${booking.location.name}`,
                `Studio: ${booking.schedule.studio.name}`,
                `Total: ${formatMoney(booking.totalPrice)}`,
            ].join("\n"),
            message,
            title: "Booking berhasil dibuat",
            type: "booking_confirmation",
            metadata: buildBookingMetadata(booking),
        });
        await notifyAdmins({
            bookingId: booking.id,
            locationId: booking.locationId,
            message: `Booking baru ${booking.bookingCode} dibuat untuk ${scheduleLabel}.`,
            metadata: buildBookingMetadata(booking, { source: "customer_booking_created" }),
            title: "Booking baru masuk",
        });
    },
    async notifyPaymentPending(bookingId) {
        const booking = await loadBookingNotificationContext(bookingId);
        if (!booking.payment) {
            return;
        }
        const expiredAtLabel = booking.payment.expiredAt ? formatDateTime(booking.payment.expiredAt) : "segera";
        const message = `Pembayaran ${booking.payment.method.toUpperCase()} untuk booking ${booking.bookingCode} sedang menunggu konfirmasi.`;
        await createCustomerNotification(booking, {
            emailHtml: buildCustomerEmailHtml({
                heading: "Pembayaran Menunggu Konfirmasi",
                lines: [
                    `Pembayaran untuk booking ${booking.bookingCode} sudah dibuat dengan metode ${booking.payment.method.toUpperCase()}.`,
                    `Nominal tagihan ${formatMoney(booking.payment.amount)} dan batas waktu pembayaran ${expiredAtLabel}.`,
                ],
                cta: "Selesaikan pembayaran sebelum batas waktu berakhir.",
            }),
            emailSubject: "Status Pembayaran Photoscape: Pending",
            emailText: [
                `Pembayaran booking ${booking.bookingCode} sedang menunggu konfirmasi.`,
                `Metode: ${booking.payment.method.toUpperCase()}`,
                `Nominal: ${formatMoney(booking.payment.amount)}`,
                `Batas waktu: ${expiredAtLabel}`,
            ].join("\n"),
            message,
            title: "Pembayaran menunggu konfirmasi",
            type: "payment_pending",
            metadata: buildBookingMetadata(booking, {
                paymentMethod: booking.payment.method,
                paymentStatus: booking.payment.status,
            }),
        });
        await notifyAdmins({
            bookingId: booking.id,
            locationId: booking.locationId,
            message: `Booking ${booking.bookingCode} membuat pembayaran ${booking.payment.method.toUpperCase()} dan menunggu konfirmasi.`,
            metadata: buildBookingMetadata(booking, {
                paymentMethod: booking.payment.method,
                paymentStatus: booking.payment.status,
            }),
            title: "Pembayaran pending",
        });
    },
    async notifyPaymentPaid(bookingId) {
        const booking = await loadBookingNotificationContext(bookingId);
        if (!booking.payment) {
            return;
        }
        const paidAtLabel = booking.payment.paidAt ? formatDateTime(booking.payment.paidAt) : formatDateTime(new Date());
        const addOnTotal = booking.addOns.reduce((sum, item) => sum + item.quantity * item.addOn.price, 0);
        const addOnLines = booking.addOns.length
            ? booking.addOns.map(item => `${item.addOn.name} x${item.quantity} (${formatMoney(item.quantity * item.addOn.price)})`)
            : ["Tidak ada add-on."];
        const message = `Pembayaran booking ${booking.bookingCode} berhasil dikonfirmasi.`;
        await createCustomerNotification(booking, {
            emailHtml: buildCustomerEmailHtml({
                heading: "Invoice Pembayaran Photoscape",
                lines: [
                    `Booking Code: ${booking.bookingCode}`,
                    `Nama Paket: ${booking.package.name} (${formatMoney(booking.package.price)})`,
                    `Add-on: ${addOnLines.join(", ")}`,
                    `Total Add-on: ${formatMoney(addOnTotal)}`,
                    `Total Pembayaran: ${formatMoney(booking.payment.amount)}`,
                    `Metode: ${booking.payment.method.toUpperCase()}`,
                    `Dibayar pada: ${paidAtLabel}`,
                    `Jadwal: ${formatDateTime(booking.schedule.startTime)} di ${booking.location.name}`,
                ],
                cta: "Invoice ini dikirim otomatis ke email akun login Anda. Tiket booking sudah siap di sistem.",
            }),
            emailSubject: "Invoice Photoscape - Pembayaran Berhasil",
            emailText: [
                `Invoice booking ${booking.bookingCode}`,
                `Paket: ${booking.package.name} (${formatMoney(booking.package.price)})`,
                `Add-on: ${addOnLines.join(", ")}`,
                `Total add-on: ${formatMoney(addOnTotal)}`,
                `Total bayar: ${formatMoney(booking.payment.amount)}`,
                `Metode: ${booking.payment.method.toUpperCase()}`,
                `Dibayar pada: ${paidAtLabel}`,
            ].join("\n"),
            message,
            title: "Pembayaran berhasil",
            type: "payment_paid",
            metadata: buildBookingMetadata(booking, {
                paidAt: booking.payment.paidAt?.toISOString() ?? null,
                paymentMethod: booking.payment.method,
            }),
        });
        await notifyAdmins({
            bookingId: booking.id,
            locationId: booking.locationId,
            message: `Pembayaran booking ${booking.bookingCode} berhasil. Booking siap diproses.`,
            metadata: buildBookingMetadata(booking, {
                paidAt: booking.payment.paidAt?.toISOString() ?? null,
                paymentMethod: booking.payment.method,
            }),
            title: "Pembayaran berhasil",
        });
    },
    async notifyPaymentFailed(bookingId, reason) {
        const booking = await loadBookingNotificationContext(bookingId);
        const failureReason = reason?.trim() || "Pembayaran tidak dapat diproses.";
        const message = `Pembayaran booking ${booking.bookingCode} gagal diproses.`;
        await createCustomerNotification(booking, {
            emailHtml: buildCustomerEmailHtml({
                heading: "Pembayaran Gagal",
                lines: [
                    `Pembayaran untuk booking ${booking.bookingCode} gagal diproses.`,
                    failureReason,
                ],
                cta: "Silakan cek status booking atau hubungi admin untuk bantuan lebih lanjut.",
            }),
            emailSubject: "Status Pembayaran Photoscape: Gagal",
            emailText: [
                `Pembayaran booking ${booking.bookingCode} gagal.`,
                `Alasan: ${failureReason}`,
            ].join("\n"),
            message,
            title: "Pembayaran gagal",
            type: "payment_failed",
            metadata: buildBookingMetadata(booking, { reason: failureReason }),
        });
        await notifyAdmins({
            bookingId: booking.id,
            locationId: booking.locationId,
            message: `Pembayaran booking ${booking.bookingCode} gagal. ${failureReason}`,
            metadata: buildBookingMetadata(booking, { reason: failureReason }),
            title: "Pembayaran gagal",
        });
    },
    async notifyBookingReminder(bookingId) {
        const booking = await loadBookingNotificationContext(bookingId);
        if (!booking.userId) {
            return;
        }
        if (await hasReminderBeenSent(booking.id, booking.userId)) {
            return;
        }
        const scheduleLabel = formatDateTime(booking.schedule.startTime);
        const message = `Pengingat jadwal booking ${booking.bookingCode}: sesi pemotretan akan dimulai pada ${scheduleLabel}.`;
        await createCustomerNotification(booking, {
            emailHtml: buildCustomerEmailHtml({
                heading: "Pengingat Jadwal Pemotretan",
                lines: [
                    `Booking ${booking.bookingCode} dijadwalkan pada ${scheduleLabel}.`,
                    `Lokasi: ${booking.location.name}, Studio: ${booking.schedule.studio.name}.`,
                ],
                cta: "Mohon datang tepat waktu agar sesi berjalan lancar.",
            }),
            emailSubject: "Pengingat Jadwal Photoscape",
            emailText: [
                `Pengingat booking ${booking.bookingCode}.`,
                `Jadwal: ${scheduleLabel}`,
                `Lokasi: ${booking.location.name}`,
                `Studio: ${booking.schedule.studio.name}`,
            ].join("\n"),
            message,
            title: "Pengingat jadwal booking",
            type: "booking_reminder",
            metadata: buildBookingMetadata(booking, { reminderLeadMinutes: REMINDER_LEAD_MINUTES }),
        });
    },
    async notifyScheduleChanged(params) {
        const booking = await loadBookingNotificationContext(params.bookingId);
        const actorLabel = params.actorName?.trim() || "Admin";
        const scheduleLabel = formatDateTime(booking.schedule.startTime);
        const message = `Jadwal booking ${booking.bookingCode} diubah oleh ${actorLabel}.`;
        await createCustomerNotification(booking, {
            emailHtml: buildCustomerEmailHtml({
                heading: "Jadwal Booking Berubah",
                lines: [
                    `${actorLabel} mengubah jadwal booking ${booking.bookingCode}.`,
                    `Jadwal terbaru Anda adalah ${scheduleLabel} di studio ${booking.schedule.studio.name}, ${booking.location.name}.`,
                ],
                cta: "Silakan cek detail booking terbaru di aplikasi.",
            }),
            emailSubject: "Perubahan Jadwal Booking Photoscape",
            emailText: [
                `Jadwal booking ${booking.bookingCode} berubah.`,
                `Jadwal terbaru: ${scheduleLabel}`,
                `Diubah oleh: ${actorLabel}`,
            ].join("\n"),
            message,
            title: "Jadwal booking berubah",
            type: "schedule_changed",
            metadata: buildBookingMetadata(booking, { actorName: actorLabel }),
        });
        await notifyAdmins({
            bookingId: booking.id,
            excludeUserIds: [],
            locationId: booking.locationId,
            message: `Booking ${booking.bookingCode} dijadwalkan ulang oleh ${actorLabel} ke ${scheduleLabel}.`,
            metadata: buildBookingMetadata(booking, { actorName: actorLabel }),
            title: "Booking di-reschedule",
        });
    },
    async notifyBookingCancelled(params) {
        const booking = await loadBookingNotificationContext(params.bookingId);
        const actorLabel = params.cancelledBy === "customer"
            ? params.actorName?.trim() || "Pengguna"
            : params.actorName?.trim() || "Admin";
        const reasonLabel = params.reason?.trim() || "Tidak ada alasan tambahan.";
        const message = `Booking ${booking.bookingCode} dibatalkan oleh ${actorLabel}.`;
        await createCustomerNotification(booking, {
            emailHtml: buildCustomerEmailHtml({
                heading: "Booking Dibatalkan",
                lines: [
                    `Booking ${booking.bookingCode} telah dibatalkan oleh ${actorLabel}.`,
                    `Alasan: ${reasonLabel}`,
                ],
            }),
            emailSubject: "Booking Photoscape Dibatalkan",
            emailText: [
                `Booking ${booking.bookingCode} dibatalkan oleh ${actorLabel}.`,
                `Alasan: ${reasonLabel}`,
            ].join("\n"),
            message,
            title: "Booking dibatalkan",
            type: "booking_cancelled",
            metadata: buildBookingMetadata(booking, {
                actorName: actorLabel,
                cancelledBy: params.cancelledBy,
                reason: reasonLabel,
            }),
        });
        await notifyAdmins({
            bookingId: booking.id,
            locationId: booking.locationId,
            message: `Booking ${booking.bookingCode} dibatalkan oleh ${actorLabel}. Alasan: ${reasonLabel}`,
            metadata: buildBookingMetadata(booking, {
                actorName: actorLabel,
                cancelledBy: params.cancelledBy,
                reason: reasonLabel,
            }),
            title: "Booking dibatalkan",
        });
    },
    async notifyAdminBookingUpdated(params) {
        const booking = await loadBookingNotificationContext(params.bookingId);
        const actorLabel = params.actorName?.trim() || "Admin";
        await notifyAdmins({
            bookingId: booking.id,
            locationId: booking.locationId,
            message: `${params.message} Oleh ${actorLabel}.`,
            metadata: buildBookingMetadata(booking, { actorName: actorLabel }),
            title: params.title,
        });
    },
    async getUserNotifications(userId, limit = 50) {
        const normalizedLimit = Math.min(Math.max(limit, 1), 100);
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: normalizedLimit,
            }),
            prisma.notification.count({
                where: {
                    isRead: false,
                    userId,
                },
            }),
        ]);
        return {
            notifications,
            unreadCount,
        };
    },
    async markNotificationAsRead(userId, notificationId) {
        return prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId,
            },
            data: {
                isRead: true,
            },
        });
    },
    async markAllNotificationsAsRead(userId) {
        return prisma.notification.updateMany({
            where: {
                isRead: false,
                userId,
            },
            data: {
                isRead: true,
            },
        });
    },
    subscribe(userId, res) {
        const existingClients = sseClients.get(userId) ?? new Set();
        existingClients.add(res);
        sseClients.set(userId, existingClients);
        res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
        const heartbeat = setInterval(() => {
            res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
        }, STREAM_HEARTBEAT_MS);
        const cleanup = () => {
            clearInterval(heartbeat);
            const clients = sseClients.get(userId);
            if (!clients) {
                return;
            }
            clients.delete(res);
            if (clients.size === 0) {
                sseClients.delete(userId);
            }
        };
        res.on("close", cleanup);
        res.on("finish", cleanup);
    },
    async runReminderDispatch() {
        const now = new Date();
        const reminderBoundary = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60 * 1000);
        const bookings = await prisma.booking.findMany({
            where: {
                status: "confirmed",
                userId: {
                    not: null,
                },
                schedule: {
                    startTime: {
                        gt: now,
                        lte: reminderBoundary,
                    },
                },
            },
            select: {
                id: true,
            },
        });
        for (const booking of bookings) {
            await this.notifyBookingReminder(booking.id);
        }
    },
    startJobs() {
        if (notificationJobsStarted) {
            return;
        }
        notificationJobsStarted = true;
        const run = async () => {
            if (notificationJobsSuspendedDueToDb) {
                return;
            }
            try {
                await this.runReminderDispatch();
            }
            catch (error) {
                if (isDatabaseConnectionError(error)) {
                    notificationJobsSuspendedDueToDb = true;
                    console.error("notification reminder job suspended: database is unreachable. restart server after DB connection is healthy.", error);
                    return;
                }
                console.error("notification reminder job failed", error);
            }
        };
        void run();
        setInterval(() => {
            void run();
        }, NOTIFICATION_JOB_INTERVAL_MS);
    },
};
//# sourceMappingURL=notification.service.js.map