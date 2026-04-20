import type { PaymentMethod, PaymentStatus, StudioType } from '@prisma/client';
type ManagerActor = {
    locationId?: string | null;
    role: 'customer' | 'admin' | 'manager' | 'owner';
    userId: string;
};
type ManagerPeriod = 'daily' | 'weekly' | 'monthly';
type ManagerCommonFilters = {
    action?: string;
    date?: string;
    endDate?: string;
    limit?: string;
    locationId?: string;
    method?: string;
    page?: string;
    period?: string;
    serviceType?: string;
    startDate?: string;
    status?: string;
    studioId?: string;
};
export declare const ManagerReportServices: {
    getFilterOptions(actor: ManagerActor, filters: ManagerCommonFilters): Promise<{
        locations: {
            id: string;
            name: string;
        }[];
        serviceTypes: import(".prisma/client").$Enums.StudioType[];
        paymentMethods: import(".prisma/client").$Enums.PaymentMethod[];
        bookingStatuses: import(".prisma/client").$Enums.BookingStatus[];
        studios: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.StudioType;
            locationId: string;
            locationName: string;
        }[];
    }>;
    getDailySummary(actor: ManagerActor, filters: ManagerCommonFilters): Promise<{
        date: string;
        totalBookings: number;
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        totalRevenuePaid: number;
        totalTransactionsDaily: number;
        totalPaidTransactionsDaily: number;
        paidAmountDaily: number;
        totalSchedules: number;
        utilizedSchedules: number;
        studioUtilizationRate: number;
    }>;
    getBookings(actor: ManagerActor, filters: ManagerCommonFilters): Promise<{
        scope: {
            role: "customer" | "admin" | "manager" | "owner";
            locationId: string | null;
        };
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        bookings: {
            bookingId: string;
            bookingCode: string;
            customerName: string;
            locationName: string;
            packageName: string;
            studioId: string;
            studioName: string;
            serviceType: import(".prisma/client").$Enums.StudioType;
            startTime: string;
            endTime: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        }[];
    }>;
    getStudioUsage(actor: ManagerActor, filters: ManagerCommonFilters): Promise<{
        scope: {
            role: "customer" | "admin" | "manager" | "owner";
            locationId: string | null;
        };
        period: ManagerPeriod;
        startDate: string;
        endDate: string;
        summary: {
            totalStudios: number;
            totalSchedules: number;
            utilizedSchedules: number;
            utilizationRate: number;
            cancelledBookings: number;
        };
        studios: {
            totalHours: number;
            totalRevenue: number;
            utilizationRate: number;
            studioId: string;
            studioName: string;
            serviceType: StudioType;
            locationName: string;
            totalSchedules: number;
            utilizedSchedules: number;
            totalSessions: number;
            totalCancelled: number;
        }[];
        trend: {
            periodLabel: string;
            totalSchedules: number;
            utilizedSchedules: number;
            utilizationRate: number;
            cancelledBookings: number;
        }[];
    }>;
    getTransactions(actor: ManagerActor, filters: ManagerCommonFilters): Promise<{
        scope: {
            role: "customer" | "admin" | "manager" | "owner";
            locationId: string | null;
        };
        filters: {
            period: ManagerPeriod;
            startDate: string;
            endDate: string;
            method: string | null;
            studioId: string | null;
            serviceType: import(".prisma/client").$Enums.StudioType | null;
        };
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        summary: {
            totalAmount: number;
            paidAmount: number;
            totalTransactions: number;
            paidCount: number;
            pendingCount: number;
            failedCount: number;
        };
        analytics: {
            period: ManagerPeriod;
            trend: {
                periodLabel: string;
                totalTransactions: number;
                paidTransactions: number;
                totalAmount: number;
                paidAmount: number;
            }[];
            byLocation: {
                totalAmount: number;
                paidAmount: number;
                locationId: string;
                locationName: string;
                totalTransactions: number;
                paidTransactions: number;
            }[];
            byMethod: {
                totalAmount: number;
                method: PaymentMethod;
                totalTransactions: number;
            }[];
            byStatus: {
                totalAmount: number;
                status: PaymentStatus;
                totalTransactions: number;
            }[];
        };
        transactions: {
            transactionId: string;
            transactionCode: string;
            bookingCode: string;
            customerName: string;
            locationName: string;
            packageName: string;
            studioId: string;
            studioName: string;
            serviceType: import(".prisma/client").$Enums.StudioType;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: number;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: string;
        }[];
    }>;
    getActivityLogs(actor: ManagerActor, filters: ManagerCommonFilters): Promise<{
        scope: {
            role: "customer" | "admin" | "manager" | "owner";
            locationId: string | null;
        };
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        logs: {
            id: string;
            action: string;
            entityType: string;
            entityId: string;
            bookingCode: string | null;
            adminId: string | null;
            adminName: string;
            locationName: string | null;
            studioName: string | null;
            serviceType: import(".prisma/client").$Enums.StudioType | null;
            createdAt: string;
        }[];
    }>;
    getPerformanceStats(actor: ManagerActor, filters: ManagerCommonFilters): Promise<{
        range: {
            startDate: string;
            endDate: string;
        };
        summary: {
            totalBookings: number;
            cancelledCount: number;
            cancellationRate: number;
            totalSchedules: number;
            utilizedSchedules: number;
            studioUtilizationRate: number;
        };
        bookingPerDay: {
            date: string;
            total: number;
        }[];
        topStudios: {
            studioId: string;
            studioName: string;
            total: number;
        }[];
        topPackages: {
            packageId: string;
            packageName: string;
            total: number;
        }[];
    }>;
};
export {};
//# sourceMappingURL=manager-report.service.d.ts.map