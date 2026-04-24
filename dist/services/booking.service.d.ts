type BookingMetaParams = {
    locationId?: string;
    studioType?: string;
};
type AvailabilityParams = {
    date?: string;
    locationId: string;
    packageId?: string;
    studioType?: string;
};
type CreateBookingPayload = {
    customerName?: string;
    customerPhone?: string;
    locationId?: string;
    packageId?: string;
    studioType?: string;
    scheduleId?: string;
    participantCount?: number;
    addOns?: Array<{
        addOnId: string;
        quantity?: number;
    }>;
};
type CancelBookingPayload = {
    reason?: string;
};
export declare const BookingServices: {
    getMeta(params: BookingMetaParams): Promise<{
        locations: {
            id: string;
            name: string;
        }[];
        studioTypes: string[];
        studios: {
            id: string;
            name: string;
            locationId: string;
            type: import(".prisma/client").$Enums.StudioType;
            capacity: number;
            isActive: boolean;
        }[];
        packages: {
            durationMinutes: number;
            id: string;
            name: string;
            price: number;
            maxCapacity: number;
        }[];
        addOns: {
            id: string;
            name: string;
            price: number;
        }[];
        paymentMethods: import(".prisma/client").$Enums.PaymentMethod[];
        bookingWindowMinutes: number;
    }>;
    getAvailability(params: AvailabilityParams): Promise<{
        location: {
            id: string;
            name: string;
        };
        date: string;
        package: {
            id: string;
            name: string;
            durationMinutes: number;
            price: number;
            maxCapacity: number;
        };
        studioType: string | null;
        serverNow: string;
        studios: {
            id: string;
            name: string;
            locationId: string;
            type: import(".prisma/client").$Enums.StudioType;
            capacity: number;
            isActive: boolean;
        }[];
        slots: {
            scheduleId: string;
            studioId: string;
            studioName: string;
            studioType: import(".prisma/client").$Enums.StudioType;
            startTime: string;
            endTime: string;
            status: "available" | "unavailable";
            reason: string | null;
        }[];
        availableSlots: {
            scheduleId: string;
            studioId: string;
            studioName: string;
            studioType: import(".prisma/client").$Enums.StudioType;
            startTime: string;
            endTime: string;
            status: "available" | "unavailable";
            reason: string | null;
        }[];
        packages?: never;
    } | {
        location: {
            id: string;
            name: string;
        };
        date: string;
        studioType: string | null;
        serverNow: string;
        studios: {
            id: string;
            name: string;
            locationId: string;
            type: import(".prisma/client").$Enums.StudioType;
            capacity: number;
            isActive: boolean;
        }[];
        packages: {
            package: {
                id: string;
                name: string;
                durationMinutes: number;
                price: number;
                maxCapacity: number;
            };
            slots: {
                scheduleId: string;
                studioId: string;
                studioName: string;
                studioType: import(".prisma/client").$Enums.StudioType;
                startTime: string;
                endTime: string;
                status: "available" | "unavailable";
                reason: string | null;
            }[];
            availableSlots: {
                scheduleId: string;
                studioId: string;
                studioName: string;
                studioType: import(".prisma/client").$Enums.StudioType;
                startTime: string;
                endTime: string;
                status: "available" | "unavailable";
                reason: string | null;
            }[];
        }[];
        package?: never;
        slots?: never;
        availableSlots?: never;
    }>;
    createBooking(userId: string, payload: CreateBookingPayload): Promise<{
        bookingId: string;
        bookingCode: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        expiresAt: string;
        summary: {
            customerName: string;
            customerPhone: string;
            location: string;
            package: string;
            studio: string;
            studioType: import(".prisma/client").$Enums.StudioType;
            scheduleDate: string;
            startTime: string;
            endTime: string;
            participantCount: number;
            addOns: {
                name: string;
                quantity: number;
                subtotal: number;
            }[];
            totalPrice: number;
        };
    }>;
    getSummary(userId: string, bookingId: string): Promise<{
        bookingId: string;
        bookingCode: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        customer: {
            name: string;
            phone: string;
        };
        location: {
            id: string;
            name: string;
        };
        package: {
            id: string;
            name: string;
            price: number;
            durationMinutes: number;
        };
        studio: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.StudioType;
        };
        schedule: {
            id: string;
            date: string;
            startTime: string;
            endTime: string;
        };
        participantCount: number;
        addOns: {
            id: string;
            name: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }[];
        pricing: {
            packagePrice: number;
            addOnTotal: number;
            totalPrice: number;
        };
        payment: {
            id: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: number;
            expiredAt: string | null;
            paidAt: string | null;
            gatewayReference: string | null;
        } | null;
        ticket: {
            id: string;
            qrCode: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            issuedAt: string;
            expiredAt: string;
        } | null;
    }>;
    createPayment(userId: string, bookingId: string, method: string): Promise<{
        bookingId: string;
        paymentId: string;
        amount: number;
        method: import(".prisma/client").$Enums.PaymentMethod;
        status: import(".prisma/client").$Enums.PaymentStatus;
        expiredAt: string | null;
        autoSuccessAfterSeconds: number | null;
        autoSuccessAt: string | null;
        gatewayReference: string | null;
        paymentPageUrl: string | null;
        instructions: string[];
    }>;
    confirmPayment(userId: string, bookingId: string): Promise<{
        bookingId: string;
        bookingCode: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        paidAt: string;
        ticket: {
            id: string;
            qrCode: string;
            expiredAt: string;
        };
    }>;
    cancelBooking(userId: string, bookingId: string, payload: CancelBookingPayload): Promise<{
        bookingId: string;
        reason: string;
        status: string;
    }>;
    getTicket(userId: string, bookingId: string): Promise<{
        bookingId: string;
        bookingCode: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        customer: {
            name: string;
            phone: string;
        };
        package: {
            name: string;
            durationMinutes: number;
        };
        location: string;
        schedule: {
            date: string;
            startTime: string;
            endTime: string;
            studioName: string;
            studioType: import(".prisma/client").$Enums.StudioType;
        };
        ticket: {
            id: string;
            qrCode: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            issuedAt: string;
            expiredAt: string;
        };
    }>;
    getHistory(userId: string): Promise<{
        history: {
            bookingCode: string;
            bookingId: string;
            createdAt: string;
            location: string;
            package: {
                durationMinutes: number;
                name: string;
            };
            payment: {
                amount: number;
                method: import(".prisma/client").$Enums.PaymentMethod;
                paidAt: string | null;
                status: import(".prisma/client").$Enums.PaymentStatus;
            } | null;
            pricing: {
                addOnTotal: number;
                totalPrice: number;
            };
            schedule: {
                date: string;
                endTime: string;
                startTime: string;
                studioName: string;
            };
            status: import(".prisma/client").$Enums.BookingStatus;
            ticket: {
                id: string;
                qrCode: string;
                status: import(".prisma/client").$Enums.TicketStatus;
            } | null;
        }[];
        summary: {
            paidBookings: number;
            totalBookings: number;
            totalSpent: number;
        };
    }>;
    sendTicketInvoiceEmail(userId: string, bookingId: string): Promise<{
        bookingId: string;
        bookingCode: string;
        email: string;
        status: "sent";
    }>;
    resendTicketInvoiceByBookingId(bookingId: string): Promise<{
        bookingId: string;
        bookingCode: string;
        email: string;
        status: "sent";
    } | {
        bookingId: string;
        bookingCode: string;
        status: "skipped";
    }>;
    getQrisPaymentPage(paymentId: string): Promise<string>;
    confirmQrisPaymentFromPage(paymentId: string): Promise<string>;
};
export {};
//# sourceMappingURL=booking.service.d.ts.map