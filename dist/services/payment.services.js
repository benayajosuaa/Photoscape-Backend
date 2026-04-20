import { prisma } from "../utils/prisma.js";
import { NotificationServices } from "./notification.service.js";
export const PENDING_BOOKING_WINDOW_MINUTES = 15;
export const VA_AUTO_SUCCESS_SECONDS = 20;
export const PAYMENT_METHODS = ["qris", "bca_va", "mandiri_va", "gopay", "ovo", "cash"];
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
export function isPaymentMethod(value) {
    return PAYMENT_METHODS.includes(value);
}
export function isVirtualAccountMethod(value) {
    return value === "bca_va" || value === "mandiri_va";
}
export function buildPaymentExpiry() {
    return addMinutes(new Date(), PENDING_BOOKING_WINDOW_MINUTES);
}
function getBaseUrl() {
    return process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? 8080}`;
}
export function buildTicketQrCode(bookingCode, versionTag) {
    const base = `PHOTOSCAPE-TICKET:${bookingCode}`;
    const tag = String(versionTag ?? "").trim();
    return tag ? `${base}|${tag}` : base;
}
export async function expireStaleBookings() {
    const now = new Date();
    const expiredPendingPaymentBookingIds = [];
    await prisma.$transaction(async (tx) => {
        const staleBookings = await tx.booking.findMany({
            where: {
                status: "pending",
                createdAt: {
                    lt: addMinutes(now, -PENDING_BOOKING_WINDOW_MINUTES),
                },
                OR: [{ payment: null }, { payment: { status: "pending" } }],
            },
            select: {
                id: true,
                payment: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
            },
        });
        if (staleBookings.length === 0) {
            return;
        }
        const bookingIds = staleBookings.map(item => item.id);
        const paymentIds = staleBookings.flatMap(item => item.payment?.status === "pending" ? [item.payment.id] : []);
        expiredPendingPaymentBookingIds.push(...staleBookings.filter(item => item.payment?.status === "pending").map(item => item.id));
        await tx.booking.updateMany({
            where: {
                id: {
                    in: bookingIds,
                },
            },
            data: {
                status: "expired",
            },
        });
        if (paymentIds.length > 0) {
            await tx.payment.updateMany({
                where: {
                    id: {
                        in: paymentIds,
                    },
                },
                data: {
                    status: "expired",
                    expiredAt: now,
                },
            });
        }
    });
    for (const bookingId of expiredPendingPaymentBookingIds) {
        await NotificationServices.notifyPaymentFailed(bookingId, "Pembayaran tidak diselesaikan sampai melewati batas waktu.");
    }
}
export async function finalizePaidBooking(tx, paymentId, paidAt) {
    const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
            booking: {
                include: {
                    schedule: true,
                    ticket: true,
                },
            },
        },
    });
    if (!payment) {
        throw new Error("Payment tidak ditemukan");
    }
    if (payment.status === "paid") {
        return payment;
    }
    if (payment.status !== "pending") {
        throw new Error("Payment ini tidak bisa dikonfirmasi");
    }
    if (payment.expiredAt && payment.expiredAt <= paidAt) {
        throw new Error("Payment sudah expired");
    }
    const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
            status: "paid",
            paidAt,
        },
    });
    await tx.booking.update({
        where: { id: payment.booking.id },
        data: {
            status: "confirmed",
        },
    });
    if (payment.booking.ticket) {
        await tx.ticket.update({
            where: { bookingId: payment.booking.id },
            data: {
                qrCode: buildTicketQrCode(payment.booking.bookingCode, payment.booking.schedule.id),
                status: "active",
                expiredAt: payment.booking.schedule.endTime,
            },
        });
    }
    else {
        await tx.ticket.create({
            data: {
                bookingId: payment.booking.id,
                qrCode: buildTicketQrCode(payment.booking.bookingCode, payment.booking.schedule.id),
                expiredAt: payment.booking.schedule.endTime,
            },
        });
    }
    return updatedPayment;
}
export async function settleDueVirtualAccountPayments() {
    const now = new Date();
    const dueAt = new Date(now.getTime() - VA_AUTO_SUCCESS_SECONDS * 1000);
    const duePayments = await prisma.payment.findMany({
        where: {
            status: "pending",
            method: {
                in: ["bca_va", "mandiri_va"],
            },
            createdAt: {
                lte: dueAt,
            },
            booking: {
                status: "pending",
            },
        },
        select: {
            id: true,
        },
    });
    for (const payment of duePayments) {
        await prisma.$transaction(async (tx) => {
            await finalizePaidBooking(tx, payment.id, new Date());
        });
        const finalizedPayment = await prisma.payment.findUnique({
            where: { id: payment.id },
            select: {
                bookingId: true,
            },
        });
        if (finalizedPayment) {
            await NotificationServices.notifyPaymentPaid(finalizedPayment.bookingId);
        }
    }
}
export async function syncBookingPayments() {
    await expireStaleBookings();
    await settleDueVirtualAccountPayments();
}
export function getPaymentInstructions(method) {
    const shared = [
        "Selesaikan pembayaran sebelum waktu expired.",
        "Simpan bukti pembayaran bila diperlukan.",
    ];
    if (method === "qris") {
        return [
            "Buka halaman simulasi bank dari paymentPageUrl.",
            "Periksa nominal lalu tekan tombol OK untuk menyelesaikan pembayaran.",
            ...shared,
        ];
    }
    if (method === "bca_va" || method === "mandiri_va") {
        return [
            "Virtual account akan tersimulasi berhasil otomatis 20 detik setelah dibuat.",
            "Cek ulang summary booking atau ticket setelah 20 detik.",
            ...shared,
        ];
    }
    if (method === "gopay" || method === "ovo") {
        return [
            "Buka aplikasi e-wallet yang dipilih.",
            "Konfirmasi pembayaran sesuai nominal tagihan.",
            ...shared,
        ];
    }
    return [
        "Selesaikan pembayaran cash di studio sesuai instruksi admin.",
        ...shared,
    ];
}
export function buildQrisPaymentPageUrl(paymentId) {
    return `${getBaseUrl()}/api/bookings/payments/${paymentId}/qris`;
}
export async function getQrisPaymentPage(paymentId) {
    await syncBookingPayments();
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
            booking: {
                include: {
                    package: true,
                    location: true,
                },
            },
        },
    });
    if (!payment)
        throw new Error("Payment tidak ditemukan");
    if (payment.method !== "qris")
        throw new Error("Halaman ini hanya untuk pembayaran QRIS");
    if (payment.status === "paid") {
        return renderQrisResultPage({
            title: "Pembayaran Berhasil",
            message: "Pembayaran QRIS sudah berhasil diproses.",
            amount: payment.amount,
            bookingCode: payment.booking.bookingCode,
            status: "paid",
        });
    }
    if (payment.expiredAt && payment.expiredAt <= new Date()) {
        throw new Error("Payment sudah expired");
    }
    return renderQrisPaymentPage({
        paymentId: payment.id,
        amount: payment.amount,
        bookingCode: payment.booking.bookingCode,
        packageName: payment.booking.package.name,
        locationName: payment.booking.location.name,
    });
}
export async function confirmQrisPaymentFromPage(paymentId) {
    await syncBookingPayments();
    const payment = await prisma.$transaction(async (tx) => {
        const currentPayment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: true,
            },
        });
        if (!currentPayment)
            throw new Error("Payment tidak ditemukan");
        if (currentPayment.method !== "qris")
            throw new Error("Halaman ini hanya untuk pembayaran QRIS");
        await finalizePaidBooking(tx, paymentId, new Date());
        return tx.payment.findUniqueOrThrow({
            where: { id: paymentId },
            include: {
                booking: true,
            },
        });
    });
    await NotificationServices.notifyPaymentPaid(payment.bookingId);
    return renderQrisResultPage({
        title: "Pembayaran Berhasil",
        message: "Pembayaran QRIS berhasil dikonfirmasi.",
        amount: payment.amount,
        bookingCode: payment.booking.bookingCode,
        status: "paid",
    });
}
function renderQrisPaymentPage(params) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Simulasi QRIS Bank</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8dbe7; margin: 0; color: #18256d; }
    .wrap { max-width: 520px; margin: 48px auto; background: #fff; border-radius: 20px; padding: 32px; box-shadow: 0 16px 40px rgba(24,37,109,.12); }
    .badge { display: inline-block; padding: 8px 14px; background: #18256d; color: #fff; border-radius: 999px; font-weight: 700; }
    .amount { font-size: 40px; font-weight: 800; margin: 16px 0; }
    .meta { color: #5d678b; line-height: 1.7; margin-bottom: 24px; }
    button { width: 100%; border: 0; border-radius: 14px; padding: 16px; font-size: 18px; font-weight: 700; color: #18256d; background: #f5a3c1; cursor: pointer; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge">Bank Simulator</div>
    <h1>Pembayaran QRIS</h1>
    <p class="meta">Booking <strong>${params.bookingCode}</strong><br/>Paket: ${params.packageName}<br/>Lokasi: ${params.locationName}</p>
    <div class="amount">Rp ${params.amount.toLocaleString("id-ID")}</div>
    <form method="POST" action="/api/bookings/payments/${params.paymentId}/qris/confirm">
      <button type="submit">OK, Bayar Sekarang</button>
    </form>
  </div>
</body>
</html>`;
}
function renderQrisResultPage(params) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${params.title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #eef2ff; margin: 0; color: #18256d; }
    .wrap { max-width: 520px; margin: 48px auto; background: #fff; border-radius: 20px; padding: 32px; box-shadow: 0 16px 40px rgba(24,37,109,.12); text-align: center; }
    .status { display: inline-block; padding: 10px 16px; background: #ddf7e7; color: #117a37; border-radius: 999px; font-weight: 700; }
    .amount { font-size: 36px; font-weight: 800; margin: 16px 0; }
    .meta { color: #5d678b; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="status">${params.status.toUpperCase()}</div>
    <h1>${params.title}</h1>
    <p class="meta">${params.message}</p>
    <div class="amount">Rp ${params.amount.toLocaleString("id-ID")}</div>
    <p class="meta">Booking Code: <strong>${params.bookingCode}</strong></p>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=payment.services.js.map