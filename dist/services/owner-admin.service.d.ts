import type { StudioType, UserRole } from '@prisma/client';
type Actor = {
    userId: string;
    role: UserRole;
    locationId?: string | null;
};
type CommonQuery = {
    page?: string;
    limit?: string;
    startDate?: string;
    endDate?: string;
    period?: string;
    search?: string;
    status?: string;
    method?: string;
    locationId?: string;
    studioId?: string;
};
export declare const OwnerAdminServices: {
    getDashboard(actor: Actor, query: CommonQuery): Promise<{
        role: import(".prisma/client").$Enums.UserRole;
        stats: {
            bookingToday: number;
            revenueToday: number;
            bookingPending: number;
            bookingCancelled: number;
            activeStudios: number;
            newCustomersThisMonth: number;
        };
        charts: {
            revenueLast7Days: {
                label: string;
                value: number;
            }[];
            monthlyBookings: {
                label: string;
                value: number;
            }[];
            busiestStudios: {
                label: string;
                value: number;
            }[];
        };
        recentActivity: {
            id: string;
            action: string;
            adminName: string;
            createdAt: string;
        }[];
    }>;
    getUsers(_actor: Actor, query: CommonQuery): Promise<{
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        users: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            locationId: string | null;
            locationName: string | null;
            createdAt: string;
            isActive: boolean;
        }[];
    }>;
    createUser(actor: Actor, payload: {
        name?: string;
        email?: string;
        password?: string;
        role?: string;
        locationId?: string | null;
    }): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        locationId: string | null;
        locationName: string | null;
        createdAt: string;
        isActive: boolean;
    }>;
    updateUser(actor: Actor, userId: string, payload: {
        name?: string;
        role?: string;
        locationId?: string | null;
    }): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        locationId: string | null;
        locationName: string | null;
        createdAt: string;
    }>;
    resetUserPassword(actor: Actor, userId: string, payload: {
        newPassword?: string;
    }): Promise<{
        success: boolean;
    }>;
    setUserStatus(actor: Actor, userId: string, payload: {
        isActive?: boolean;
    }): Promise<{
        success: boolean;
        isActive: boolean;
    }>;
    getCustomers(_actor: Actor, query: CommonQuery): Promise<{
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        customers: {
            id: string;
            name: string;
            email: string;
            phone: string | null;
            totalBookings: number;
            lastBookingAt: string | null;
            blacklisted: boolean;
        }[];
    }>;
    getCustomerDetail(_actor: Actor, customerId: string): Promise<{
        id: string;
        name: string;
        email: string;
        history: {
            bookingId: string;
            bookingCode: string;
            date: string;
            studioName: string;
            packageName: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        }[];
    }>;
    updateCustomer(actor: Actor, customerId: string, payload: {
        name?: string;
        email?: string;
    }): Promise<{
        id: string;
        name: string;
        email: string;
    }>;
    setCustomerBlacklist(actor: Actor, customerId: string, payload: {
        blacklisted?: boolean;
        reason?: string;
    }): Promise<{
        id: string;
        blacklisted: boolean;
    }>;
    getTransactions(_actor: Actor, query: CommonQuery): Promise<{
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        summary: {
            totalAmount: number;
            totalTransactions: number;
            paidAmount: number;
        };
        transactions: {
            id: string;
            invoice: string;
            bookingCode: string;
            customer: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amount: number;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: string;
            locationName: string;
            studioName: string;
        }[];
    }>;
    confirmTransaction(actor: Actor, transactionId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        paidAt: string | null;
    }>;
    refundTransaction(actor: Actor, transactionId: string, payload: {
        reason?: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        refundRequested: boolean;
    }>;
    exportTransactions(_actor: Actor, query: CommonQuery): Promise<string>;
    getReportsDashboard(actor: Actor, query: CommonQuery): Promise<{
        role: import(".prisma/client").$Enums.UserRole;
        stats: {
            bookingToday: number;
            revenueToday: number;
            bookingPending: number;
            bookingCancelled: number;
            activeStudios: number;
            newCustomersThisMonth: number;
        };
        charts: {
            revenueLast7Days: {
                label: string;
                value: number;
            }[];
            monthlyBookings: {
                label: string;
                value: number;
            }[];
            busiestStudios: {
                label: string;
                value: number;
            }[];
        };
        recentActivity: {
            id: string;
            action: string;
            adminName: string;
            createdAt: string;
        }[];
    }>;
    getReportsRevenue(_actor: Actor, query: CommonQuery): Promise<{
        startDate: string;
        endDate: string;
        period: string;
        summary: {
            totalTransactions: number;
            totalAmount: number;
            totalPaidAmount: number;
        };
        revenue: {
            periodLabel: string;
            totalAmount: number;
            paidAmount: number;
            transactionCount: number;
        }[];
    }>;
    getReportsBookings(_actor: Actor, query: CommonQuery): Promise<{
        startDate: string;
        endDate: string;
        period: string;
        summary: {
            totalBookings: number;
            cancelRate: number;
        };
        bookings: {
            periodLabel: string;
            totalBookings: number;
            cancelBookings: number;
            cancelRate: number;
        }[];
    }>;
    getReportsStudioUsage(_actor: Actor, query: CommonQuery): Promise<{
        startDate: string;
        endDate: string;
        summary: {
            totalStudios: number;
            totalSlots: number;
            utilizedSlots: number;
            studioUtilization: number;
        };
        studios: {
            utilizationRate: number;
            studioId: string;
            studioName: string;
            studioType: StudioType;
            totalSlots: number;
            utilizedSlots: number;
        }[];
        serviceTypes: import(".prisma/client").$Enums.StudioType[];
    }>;
    getLogs(_actor: Actor, query: CommonQuery): Promise<{
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        logs: {
            id: string;
            action: string;
            entityType: string;
            entityId: string;
            adminName: string;
            bookingCode: string | null;
            createdAt: string;
        }[];
    }>;
    getSchedules(_actor: Actor, query: CommonQuery): Promise<{
        startDate: string;
        endDate: string;
        schedules: {
            id: string;
            date: string;
            startTime: string;
            endTime: string;
            studioId: string;
            studioName: string;
            studioType: import(".prisma/client").$Enums.StudioType;
            booked: boolean;
            bookingId: string | null;
            bookingCode: string | null;
        }[];
        blockedSlots: {
            id: string;
            studioId: string;
            startTime: string;
            endTime: string;
            reason: string | null;
        }[];
    }>;
    blockSchedule(actor: Actor, payload: {
        studioId?: string;
        startTime?: string;
        endTime?: string;
        reason?: string;
    }): Promise<{
        id: string;
        studioId: string;
        startTime: string;
        endTime: string;
        reason: string | null;
    }>;
    unblockSchedule(actor: Actor, blockId: string): Promise<{
        success: boolean;
        blockId: string;
    }>;
    updateOperationalHours(actor: Actor, payload: {
        studioId?: string | null;
        openHour?: string;
        closeHour?: string;
    }): Promise<{
        studioId: string;
        openHour: string;
        closeHour: string;
    }>;
};
export {};
//# sourceMappingURL=owner-admin.service.d.ts.map