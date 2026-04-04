import type { Prisma } from "@prisma/client";
type ReportActor = {
    locationId?: string | null;
    role: "customer" | "admin" | "manager" | "owner";
    userId: string;
};
type CommonReportFilters = {
    endDate?: string;
    locationId?: string;
    packageId?: string;
    startDate?: string;
    studioId?: string;
};
type BookingReportFilters = CommonReportFilters & {
    bookingStatus?: string;
};
type PaymentReportFilters = CommonReportFilters & {
    paymentMethod?: string;
    paymentStatus?: string;
};
type AdminActivityFilters = CommonReportFilters & {
    action?: string;
    adminId?: string;
};
type StudioUsageFilters = CommonReportFilters & {
    groupBy?: string;
};
type PerformanceFilters = CommonReportFilters;
export declare const OperationsReportServices: {
    getDashboardSummary(actor: ReportActor, filters: CommonReportFilters): Promise<{
        scope: {
            locationId: string | null;
            role: "customer" | "admin" | "manager" | "owner";
        };
        filters: {
            endDate: string;
            locationId: string | null;
            packageId: string | null;
            startDate: string;
            studioId: string | null;
        };
        summary: {
            totalBookings: number;
            totalStudios: number;
            totalTransactions: number;
            totalRevenuePaid: number;
            bookingStatuses: Record<import(".prisma/client").$Enums.BookingStatus, number>;
            paymentStatuses: Record<import(".prisma/client").$Enums.PaymentStatus, number>;
            dailyTransactions: {
                count: number;
                pendingCount: number;
                failedCount: number;
                paidAmount: number;
            };
            studioUsage: {
                totalSchedules: number;
                utilizedSchedules: number;
                utilizationRate: number;
            };
            cancellations: {
                total: number;
                rate: number;
            };
            adminActivityCount: number;
        };
    }>;
    getBookingReport(actor: ReportActor, filters: BookingReportFilters): Promise<{
        scope: {
            locationId: string | null;
            role: "customer" | "admin" | "manager" | "owner";
        };
        filters: {
            bookingStatus: string | null;
            endDate: string;
            locationId: string | null;
            packageId: string | null;
            startDate: string;
            studioId: string | null;
        };
        summary: {
            byStatus: Record<import(".prisma/client").$Enums.BookingStatus, number>;
            total: number;
        };
        bookings: {
            bookingCode: string;
            bookingId: string;
            createdAt: string;
            customer: {
                email: string | null;
                name: string;
                phone: string;
                registeredUserId: string | null;
            };
            location: {
                id: string;
                name: string;
            };
            package: {
                durationMinutes: number;
                id: string;
                name: string;
                price: number;
            };
            payment: {
                amount: number;
                createdAt: string;
                id: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                paidAt: string | null;
                status: import(".prisma/client").$Enums.PaymentStatus;
            } | null;
            schedule: {
                date: string;
                endTime: string;
                startTime: string;
                studio: {
                    id: string;
                    name: string;
                    type: import(".prisma/client").$Enums.StudioType;
                };
            };
            source: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            totalPrice: number;
        }[];
    }>;
    getStudioUsageReport(actor: ReportActor, filters: StudioUsageFilters): Promise<{
        scope: {
            locationId: string | null;
            role: "customer" | "admin" | "manager" | "owner";
        };
        filters: {
            endDate: string;
            groupBy: string;
            locationId: string | null;
            packageId: string | null;
            startDate: string;
            studioId: string | null;
        };
        summary: {
            totalStudios: number;
            totalSchedules: number;
            utilizedSchedules: number;
        };
        byStudio: {
            location: string;
            studio: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.StudioType;
            };
            totalSchedules: number;
            utilizedSchedules: number;
            utilizationRate: number;
        }[];
        trend: {
            periodLabel: string;
            totalSchedules: number;
            utilizedSchedules: number;
            utilizationRate: number;
        }[];
    }>;
    getPaymentReport(actor: ReportActor, filters: PaymentReportFilters): Promise<{
        scope: {
            locationId: string | null;
            role: "customer" | "admin" | "manager" | "owner";
        };
        filters: {
            endDate: string;
            locationId: string | null;
            packageId: string | null;
            paymentMethod: string | null;
            paymentStatus: string | null;
            startDate: string;
            studioId: string | null;
        };
        summary: {
            byMethod: Record<import(".prisma/client").$Enums.PaymentMethod, number>;
            byStatus: Record<import(".prisma/client").$Enums.PaymentStatus, number>;
            totalAmount: number;
            totalPaidAmount: number;
            totalTransactions: number;
        };
        payments: {
            bookingCode: string;
            bookingId: string;
            customerName: string;
            location: string;
            packageName: string;
            payment: {
                amount: number;
                createdAt: string;
                expiredAt: string | null;
                gatewayReference: string | null;
                id: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                paidAt: string | null;
                status: import(".prisma/client").$Enums.PaymentStatus;
            };
            studioName: string;
        }[];
    }>;
    getPerformanceReport(actor: ReportActor, filters: PerformanceFilters): Promise<{
        scope: {
            locationId: string | null;
            role: "customer" | "admin" | "manager" | "owner";
        };
        filters: {
            endDate: string;
            locationId: string | null;
            packageId: string | null;
            startDate: string;
            studioId: string | null;
        };
        summary: {
            totalBookings: number;
            cancellationRate: number;
            completionRate: number;
            paymentSuccessRate: number;
            studioUtilizationRate: number;
        };
        studioPerformance: {
            location: string;
            studio: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.StudioType;
            };
            totalSchedules: number;
            utilizedSchedules: number;
            utilizationRate: number;
        }[];
        bookingStatusBreakdown: Record<import(".prisma/client").$Enums.BookingStatus, number>;
        paymentStatusBreakdown: Record<import(".prisma/client").$Enums.PaymentStatus, number>;
    }>;
    getAdminActivityReport(actor: ReportActor, filters: AdminActivityFilters): Promise<{
        scope: {
            locationId: string | null;
            role: "customer" | "admin" | "manager" | "owner";
        };
        filters: {
            action: string | null;
            adminId: string | null;
            endDate: string;
            locationId: string | null;
            startDate: string;
        };
        summary: {
            totalLogs: number;
            uniqueAdmins: number;
        };
        activities: {
            action: string;
            admin: {
                email: string;
                id: string;
                name: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            booking: {
                bookingId: string;
                bookingCode: string;
                location: string;
                studioName: string;
            } | null;
            createdAt: string;
            entityId: string;
            entityType: string;
            id: string;
            newData: Prisma.JsonValue;
            oldData: Prisma.JsonValue;
        }[];
    }>;
};
export {};
//# sourceMappingURL=operations-report.service.d.ts.map