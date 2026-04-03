import { Prisma } from "@prisma/client";
export type AdminActor = {
    locationId?: string | null;
    locationName?: string | null;
    role: "customer" | "admin" | "manager" | "owner";
    userId: string;
};
type BookingFilterParams = {
    date?: string;
    search?: string;
    status?: string;
};
type BookingAddOnInput = {
    addOnId: string;
    quantity?: number;
};
type UpdateBookingPayload = {
    customerName?: string;
    customerPhone?: string;
    participantCount?: number;
    packageId?: string;
    addOns?: BookingAddOnInput[];
};
type RescheduleBookingPayload = {
    scheduleId?: string;
};
type CancelBookingPayload = {
    reason?: string;
};
type UpdateBookingStatusPayload = {
    status?: string;
    reason?: string;
};
export declare const AdminBookingServices: {
    getBookings(actor: AdminActor, params: BookingFilterParams): Promise<{
        total: number;
        filters: {
            date: string | null;
            search: string | null;
            status: string | null;
        };
        bookings: {
            bookingId: string;
            bookingCode: string;
            createdAt: string;
            updatedAt: string;
            source: string;
            status: {
                booking: import(".prisma/client").$Enums.BookingStatus;
                payment: import(".prisma/client").$Enums.PaymentStatus | null;
                label: string;
            };
            customer: {
                name: string;
                phone: string;
                type: string;
                user: {
                    id: string;
                    name: string;
                    email: string;
                    role: import(".prisma/client").$Enums.UserRole;
                } | null;
            };
            adminInputBy: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            location: {
                id: string;
                name: string;
            };
            package: {
                id: string;
                name: string;
                price: number;
                durationMinutes: number;
                maxCapacity: number;
            };
            studio: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.StudioType;
                capacity: number;
            };
            schedule: {
                id: string;
                date: string;
                startTime: string;
                endTime: string;
            };
            participantCount: number;
            pricing: {
                packagePrice: number;
                addOnTotal: number;
                totalPrice: number;
            };
            addOns: {
                id: string;
                name: string;
                quantity: number;
                unitPrice: number;
                subtotal: number;
            }[];
            payment: {
                id: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                status: import(".prisma/client").$Enums.PaymentStatus;
                amount: number;
                gatewayReference: string | null;
                paidAt: string | null;
                expiredAt: string | null;
                createdAt: string;
            } | null;
            ticket: {
                id: string;
                qrCode: string;
                status: import(".prisma/client").$Enums.TicketStatus;
                issuedAt: string;
                expiredAt: string;
                scannedAt: string | null;
            } | null;
        }[];
    }>;
    getBookingDetail(actor: AdminActor, bookingId: string): Promise<{
        booking: {
            bookingId: string;
            bookingCode: string;
            createdAt: string;
            updatedAt: string;
            source: string;
            status: {
                booking: import(".prisma/client").$Enums.BookingStatus;
                payment: import(".prisma/client").$Enums.PaymentStatus | null;
                label: string;
            };
            customer: {
                name: string;
                phone: string;
                type: string;
                user: {
                    id: string;
                    name: string;
                    email: string;
                    role: import(".prisma/client").$Enums.UserRole;
                } | null;
            };
            adminInputBy: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            location: {
                id: string;
                name: string;
            };
            package: {
                id: string;
                name: string;
                price: number;
                durationMinutes: number;
                maxCapacity: number;
            };
            studio: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.StudioType;
                capacity: number;
            };
            schedule: {
                id: string;
                date: string;
                startTime: string;
                endTime: string;
            };
            participantCount: number;
            pricing: {
                packagePrice: number;
                addOnTotal: number;
                totalPrice: number;
            };
            addOns: {
                id: string;
                name: string;
                quantity: number;
                unitPrice: number;
                subtotal: number;
            }[];
            payment: {
                id: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                status: import(".prisma/client").$Enums.PaymentStatus;
                amount: number;
                gatewayReference: string | null;
                paidAt: string | null;
                expiredAt: string | null;
                createdAt: string;
            } | null;
            ticket: {
                id: string;
                qrCode: string;
                status: import(".prisma/client").$Enums.TicketStatus;
                issuedAt: string;
                expiredAt: string;
                scannedAt: string | null;
            } | null;
        };
        history: {
            id: string;
            action: string;
            createdAt: string;
            admin: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            oldData: Prisma.JsonValue;
            newData: Prisma.JsonValue;
        }[];
    }>;
    getBookingLogs(actor: AdminActor, bookingId: string): Promise<{
        bookingId: string;
        total: number;
        logs: {
            id: string;
            action: string;
            createdAt: string;
            admin: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            oldData: Prisma.JsonValue;
            newData: Prisma.JsonValue;
        }[];
    }>;
    updateBooking(actor: AdminActor, bookingId: string, payload: UpdateBookingPayload): Promise<{
        bookingId: string;
        bookingCode: string;
        createdAt: string;
        updatedAt: string;
        source: string;
        status: {
            booking: import(".prisma/client").$Enums.BookingStatus;
            payment: import(".prisma/client").$Enums.PaymentStatus | null;
            label: string;
        };
        customer: {
            name: string;
            phone: string;
            type: string;
            user: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        };
        adminInputBy: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        } | null;
        location: {
            id: string;
            name: string;
        };
        package: {
            id: string;
            name: string;
            price: number;
            durationMinutes: number;
            maxCapacity: number;
        };
        studio: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.StudioType;
            capacity: number;
        };
        schedule: {
            id: string;
            date: string;
            startTime: string;
            endTime: string;
        };
        participantCount: number;
        pricing: {
            packagePrice: number;
            addOnTotal: number;
            totalPrice: number;
        };
        addOns: {
            id: string;
            name: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }[];
        payment: {
            id: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: number;
            gatewayReference: string | null;
            paidAt: string | null;
            expiredAt: string | null;
            createdAt: string;
        } | null;
        ticket: {
            id: string;
            qrCode: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            issuedAt: string;
            expiredAt: string;
            scannedAt: string | null;
        } | null;
    }>;
    rescheduleBooking(actor: AdminActor, bookingId: string, payload: RescheduleBookingPayload): Promise<{
        bookingId: string;
        bookingCode: string;
        createdAt: string;
        updatedAt: string;
        source: string;
        status: {
            booking: import(".prisma/client").$Enums.BookingStatus;
            payment: import(".prisma/client").$Enums.PaymentStatus | null;
            label: string;
        };
        customer: {
            name: string;
            phone: string;
            type: string;
            user: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        };
        adminInputBy: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        } | null;
        location: {
            id: string;
            name: string;
        };
        package: {
            id: string;
            name: string;
            price: number;
            durationMinutes: number;
            maxCapacity: number;
        };
        studio: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.StudioType;
            capacity: number;
        };
        schedule: {
            id: string;
            date: string;
            startTime: string;
            endTime: string;
        };
        participantCount: number;
        pricing: {
            packagePrice: number;
            addOnTotal: number;
            totalPrice: number;
        };
        addOns: {
            id: string;
            name: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }[];
        payment: {
            id: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: number;
            gatewayReference: string | null;
            paidAt: string | null;
            expiredAt: string | null;
            createdAt: string;
        } | null;
        ticket: {
            id: string;
            qrCode: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            issuedAt: string;
            expiredAt: string;
            scannedAt: string | null;
        } | null;
    }>;
    cancelBooking(actor: AdminActor, bookingId: string, payload: CancelBookingPayload): Promise<{
        booking: {
            bookingId: string;
            bookingCode: string;
            createdAt: string;
            updatedAt: string;
            source: string;
            status: {
                booking: import(".prisma/client").$Enums.BookingStatus;
                payment: import(".prisma/client").$Enums.PaymentStatus | null;
                label: string;
            };
            customer: {
                name: string;
                phone: string;
                type: string;
                user: {
                    id: string;
                    name: string;
                    email: string;
                    role: import(".prisma/client").$Enums.UserRole;
                } | null;
            };
            adminInputBy: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            location: {
                id: string;
                name: string;
            };
            package: {
                id: string;
                name: string;
                price: number;
                durationMinutes: number;
                maxCapacity: number;
            };
            studio: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.StudioType;
                capacity: number;
            };
            schedule: {
                id: string;
                date: string;
                startTime: string;
                endTime: string;
            };
            participantCount: number;
            pricing: {
                packagePrice: number;
                addOnTotal: number;
                totalPrice: number;
            };
            addOns: {
                id: string;
                name: string;
                quantity: number;
                unitPrice: number;
                subtotal: number;
            }[];
            payment: {
                id: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                status: import(".prisma/client").$Enums.PaymentStatus;
                amount: number;
                gatewayReference: string | null;
                paidAt: string | null;
                expiredAt: string | null;
                createdAt: string;
            } | null;
            ticket: {
                id: string;
                qrCode: string;
                status: import(".prisma/client").$Enums.TicketStatus;
                issuedAt: string;
                expiredAt: string;
                scannedAt: string | null;
            } | null;
        };
        reason: string;
    }>;
    updateBookingStatus(actor: AdminActor, bookingId: string, payload: UpdateBookingStatusPayload): Promise<{
        bookingId: string;
        bookingCode: string;
        createdAt: string;
        updatedAt: string;
        source: string;
        status: {
            booking: import(".prisma/client").$Enums.BookingStatus;
            payment: import(".prisma/client").$Enums.PaymentStatus | null;
            label: string;
        };
        customer: {
            name: string;
            phone: string;
            type: string;
            user: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        };
        adminInputBy: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        } | null;
        location: {
            id: string;
            name: string;
        };
        package: {
            id: string;
            name: string;
            price: number;
            durationMinutes: number;
            maxCapacity: number;
        };
        studio: {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.StudioType;
            capacity: number;
        };
        schedule: {
            id: string;
            date: string;
            startTime: string;
            endTime: string;
        };
        participantCount: number;
        pricing: {
            packagePrice: number;
            addOnTotal: number;
            totalPrice: number;
        };
        addOns: {
            id: string;
            name: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }[];
        payment: {
            id: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: number;
            gatewayReference: string | null;
            paidAt: string | null;
            expiredAt: string | null;
            createdAt: string;
        } | null;
        ticket: {
            id: string;
            qrCode: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            issuedAt: string;
            expiredAt: string;
            scannedAt: string | null;
        } | null;
    } | {
        booking: {
            bookingId: string;
            bookingCode: string;
            createdAt: string;
            updatedAt: string;
            source: string;
            status: {
                booking: import(".prisma/client").$Enums.BookingStatus;
                payment: import(".prisma/client").$Enums.PaymentStatus | null;
                label: string;
            };
            customer: {
                name: string;
                phone: string;
                type: string;
                user: {
                    id: string;
                    name: string;
                    email: string;
                    role: import(".prisma/client").$Enums.UserRole;
                } | null;
            };
            adminInputBy: {
                id: string;
                name: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            location: {
                id: string;
                name: string;
            };
            package: {
                id: string;
                name: string;
                price: number;
                durationMinutes: number;
                maxCapacity: number;
            };
            studio: {
                id: string;
                name: string;
                type: import(".prisma/client").$Enums.StudioType;
                capacity: number;
            };
            schedule: {
                id: string;
                date: string;
                startTime: string;
                endTime: string;
            };
            participantCount: number;
            pricing: {
                packagePrice: number;
                addOnTotal: number;
                totalPrice: number;
            };
            addOns: {
                id: string;
                name: string;
                quantity: number;
                unitPrice: number;
                subtotal: number;
            }[];
            payment: {
                id: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                status: import(".prisma/client").$Enums.PaymentStatus;
                amount: number;
                gatewayReference: string | null;
                paidAt: string | null;
                expiredAt: string | null;
                createdAt: string;
            } | null;
            ticket: {
                id: string;
                qrCode: string;
                status: import(".prisma/client").$Enums.TicketStatus;
                issuedAt: string;
                expiredAt: string;
                scannedAt: string | null;
            } | null;
        };
        reason: string;
    }>;
};
export {};
//# sourceMappingURL=admin-booking.service.d.ts.map