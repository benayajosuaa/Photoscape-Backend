import type { PaymentMethod, Prisma } from "@prisma/client";
export declare const PENDING_BOOKING_WINDOW_MINUTES = 15;
export declare const VA_AUTO_SUCCESS_SECONDS = 20;
export declare const PAYMENT_METHODS: PaymentMethod[];
export declare function isPaymentMethod(value: string): value is PaymentMethod;
export declare function isVirtualAccountMethod(value: PaymentMethod): value is "bca_va" | "mandiri_va";
export declare function buildPaymentExpiry(): Date;
export declare function buildTicketQrCode(bookingCode: string): string;
export declare function expireStaleBookings(): Promise<void>;
export declare function finalizePaidBooking(tx: Prisma.TransactionClient, paymentId: string, paidAt: Date): Promise<{
    id: string;
    createdAt: Date;
    status: import(".prisma/client").$Enums.PaymentStatus;
    bookingId: string;
    amount: number;
    method: import(".prisma/client").$Enums.PaymentMethod;
    gatewayReference: string | null;
    paidAt: Date | null;
    expiredAt: Date | null;
}>;
export declare function settleDueVirtualAccountPayments(): Promise<void>;
export declare function syncBookingPayments(): Promise<void>;
export declare function getPaymentInstructions(method: PaymentMethod): string[];
export declare function buildQrisPaymentPageUrl(paymentId: string): string;
export declare function getQrisPaymentPage(paymentId: string): Promise<string>;
export declare function confirmQrisPaymentFromPage(paymentId: string): Promise<string>;
//# sourceMappingURL=payment.services.d.ts.map