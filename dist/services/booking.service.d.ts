import type { Prisma } from "@prisma/client";
type BookingMetaParams = {
    locationId?: string;
    studioType?: string;
};
type AvailabilityParams = {
    date: string;
    locationId: string;
    packageId: string;
    studioType: string;
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
type AdminBookingListParams = {
    bookingCode?: string;
    customerName?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    paymentStatus?: string;
    locationId?: string;
    studioType?: string;
};
type AdminReschedulePayload = {
    scheduleId?: string;
    reason?: string;
};
type AdminCancelPayload = {
    reason?: string;
};
type RevenueGroupBy = "daily" | "weekly" | "monthly";
type AdminRevenueReportParams = {
    groupBy?: string;
    dateFrom?: string;
    dateTo?: string;
    locationId?: string;
};
export declare const BookingServices: {
    getMeta(params: BookingMetaParams): Promise<{
        locations: {
            name: string;
            id: string;
        }[];
        studioTypes: string[];
        studios: {
            name: string;
            id: string;
            locationId: string;
            type: import(".prisma/client").$Enums.StudioType;
            capacity: number;
            isActive: boolean;
        }[];
        packages: {
            name: string;
            id: string;
            price: number;
            durationMinutes: number;
            maxCapacity: number;
        }[];
        addOns: {
            name: string;
            id: string;
            price: number;
        }[];
        paymentMethods: import(".prisma/client").$Enums.PaymentMethod[];
        bookingWindowMinutes: number;
    }>;
    getAvailability(params: AvailabilityParams): Promise<{
        location: {
            name: string;
            id: string;
        };
        date: string;
        package: {
            id: string;
            name: string;
            durationMinutes: number;
            price: number;
            maxCapacity: number;
        };
        studioType: import(".prisma/client").$Enums.StudioType;
        studios: {
            name: string;
            id: string;
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
    getAdminBookings(params: AdminBookingListParams): Promise<{
        filters: AdminBookingListParams;
        summary: {
            totalBookings: number;
            totalOrderValue: number;
            totalPaidAmount: number;
            pendingBookings: number;
            confirmedBookings: number;
            completedBookings: number;
            cancelledBookings: number;
            problematicBookings: number;
        };
        items: {
            bookingId: string;
            bookingCode: string;
            source: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            issueFlags: string[];
            customer: {
                name: string;
                phone: string;
                accountName: string | null;
                accountEmail: string | null;
            };
            bookingContext: {
                location: string;
                package: string;
                studio: string;
                studioType: import(".prisma/client").$Enums.StudioType;
                date: string;
                startTime: string;
                endTime: string;
                participantCount: number;
            };
            payment: {
                totalPrice: number;
                paymentStatus: import(".prisma/client").$Enums.PaymentStatus | null;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
                paidAmount: number;
                gatewayReference: string | null;
            };
            handledBy: {
                id: string;
                name: string;
                email: string;
            } | null;
            lastAudit: {
                action: string;
                at: string;
                actorName: string | null;
            } | null;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    getAdminBookingDetail(bookingId: string): Promise<{
        bookingId: string;
        bookingCode: string;
        source: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        issueFlags: string[];
        customer: {
            name: string;
            phone: string;
            user: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        };
        handledBy: {
            id: string;
            name: string;
            email: string;
        } | null;
        bookingContext: {
            location: {
                id: string;
                name: string;
            };
            package: {
                id: string;
                name: string;
                durationMinutes: number;
                maxCapacity: number;
                price: number;
            };
            schedule: {
                id: string;
                date: string;
                startTime: string;
                endTime: string;
            };
            studio: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.StudioType;
                capacity: number;
            };
            participantCount: number;
            addOns: {
                id: string;
                name: string;
                quantity: number;
                unitPrice: number;
                subtotal: number;
            }[];
        };
        financialContext: {
            packagePrice: number;
            addOnTotal: number;
            totalOrderValue: number;
            payment: {
                id: string;
                status: import(".prisma/client").$Enums.PaymentStatus;
                method: import(".prisma/client").$Enums.PaymentMethod;
                amount: number;
                gatewayReference: string | null;
                paidAt: string | null;
                expiredAt: string | null;
            } | null;
        };
        ticket: {
            id: string;
            qrCode: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            issuedAt: string;
            expiredAt: string;
        } | null;
        auditTrail: {
            id: string;
            action: string;
            actor: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            oldData: Prisma.JsonValue;
            newData: Prisma.JsonValue;
            createdAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    getAdminAuditLogs(params: {
        bookingId?: string;
        action?: string;
    }): Promise<{
        total: number;
        items: {
            id: string;
            action: string;
            bookingId: string | null;
            bookingCode: string | null;
            bookingStatus: import(".prisma/client").$Enums.BookingStatus | null;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus | null;
            paymentAmount: number | null;
            actor: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            oldData: Prisma.JsonValue;
            newData: Prisma.JsonValue;
            createdAt: string;
        }[];
    }>;
    getAdminRevenueReport(params: AdminRevenueReportParams): Promise<{
        filters: {
            groupBy: RevenueGroupBy;
            dateFrom: string;
            dateTo: string;
            locationId: string | null;
            timezone: string;
        };
        summary: {
            paidTransactions: number;
            grossRevenue: number;
            cancelledPaidBookings: number;
            cancelledPaidAmount: number;
            activeRevenueEstimate: number;
        };
        periods: {
            label: string;
            periodStart: string;
            periodEnd: string;
            paidTransactions: number;
            grossRevenue: number;
            cancelledPaidBookings: number;
            cancelledPaidAmount: number;
            activeRevenueEstimate: number;
        }[];
        revenueByLocation: {
            locationId: string;
            locationName: string;
            grossRevenue: number;
            paidTransactions: number;
        }[];
    }>;
    rescheduleAdminBooking(adminUserId: string, bookingId: string, payload: AdminReschedulePayload): Promise<{
        bookingId: string;
        bookingCode: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        newSchedule: {
            id: string;
            studioName: string;
            studioType: import(".prisma/client").$Enums.StudioType;
            startTime: string;
            endTime: string;
        };
    }>;
    cancelAdminBooking(adminUserId: string, bookingId: string, payload: AdminCancelPayload): Promise<{
        bookingId: string;
        bookingCode: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        reason: string;
        refundFollowUpRequired: boolean;
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
    getQrisPaymentPage(paymentId: string): Promise<string>;
    confirmQrisPaymentFromPage(paymentId: string): Promise<string>;
};
export {};
//# sourceMappingURL=booking.service.d.ts.map