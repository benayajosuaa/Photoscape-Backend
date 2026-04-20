import { prisma } from "../utils/prisma.js";
const UTILIZED_BOOKING_STATUSES = ["pending", "confirmed", "completed"];
const PAYMENT_METHOD_VALUES = ["qris", "bca_va", "mandiri_va", "gopay", "ovo", "cash"];
const PAYMENT_STATUS_VALUES = ["pending", "paid", "failed", "expired"];
const BOOKING_STATUS_VALUES = ["pending", "confirmed", "completed", "cancelled", "expired"];
const reportBookingInclude = {
    location: true,
    package: true,
    payment: true,
    creator: true,
    user: true,
    schedule: {
        include: {
            studio: true,
        },
    },
    ticket: true,
};
function parseDateOnly(value) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
        throw new Error("Tanggal tidak valid");
    }
    return date;
}
function startOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
function endOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
function startOfWeek(date) {
    const normalized = startOfDay(date);
    const day = normalized.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    normalized.setUTCDate(normalized.getUTCDate() + diff);
    return normalized;
}
function startOfMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}
function toPercent(value) {
    return Number(value.toFixed(2));
}
function isOwner(actor) {
    return actor.role === "owner";
}
function getScopedLocationId(actor) {
    if (isOwner(actor)) {
        return null;
    }
    if (!actor.locationId) {
        throw new Error("Akun ini tidak memiliki lokasi yang terdaftar");
    }
    return actor.locationId;
}
function resolveLocationFilter(actor, requestedLocationId) {
    const scopedLocationId = getScopedLocationId(actor);
    if (scopedLocationId) {
        return scopedLocationId;
    }
    return requestedLocationId?.trim() || null;
}
function isBookingStatus(value) {
    return BOOKING_STATUS_VALUES.includes(value);
}
function isPaymentStatus(value) {
    return PAYMENT_STATUS_VALUES.includes(value);
}
function isPaymentMethod(value) {
    return PAYMENT_METHOD_VALUES.includes(value);
}
function parsePeriod(filters) {
    const startDate = filters.startDate?.trim();
    const endDate = filters.endDate?.trim();
    const start = startDate ? startOfDay(parseDateOnly(startDate)) : startOfMonth(new Date());
    const end = endDate ? endOfDay(parseDateOnly(endDate)) : endOfDay(new Date());
    if (end < start) {
        throw new Error("Rentang tanggal tidak valid");
    }
    return { end, start };
}
function buildPeriodLabel(date, groupBy) {
    if (groupBy === "monthly") {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    if (groupBy === "weekly") {
        const weekStart = startOfWeek(date);
        return weekStart.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
}
function serializeBookingRecord(booking) {
    return {
        bookingCode: booking.bookingCode,
        bookingId: booking.id,
        createdAt: booking.createdAt.toISOString(),
        customer: {
            email: booking.user?.email ?? null,
            name: booking.customerName,
            phone: booking.customerPhone,
            registeredUserId: booking.userId,
        },
        location: {
            id: booking.location.id,
            name: booking.location.name,
        },
        package: {
            durationMinutes: booking.package.durationMinutes,
            id: booking.package.id,
            name: booking.package.name,
            price: booking.package.price,
        },
        payment: booking.payment
            ? {
                amount: booking.payment.amount,
                createdAt: booking.payment.createdAt.toISOString(),
                id: booking.payment.id,
                method: booking.payment.method,
                paidAt: booking.payment.paidAt?.toISOString() ?? null,
                status: booking.payment.status,
            }
            : null,
        schedule: {
            date: booking.schedule.date.toISOString(),
            endTime: booking.schedule.endTime.toISOString(),
            startTime: booking.schedule.startTime.toISOString(),
            studio: {
                id: booking.schedule.studio.id,
                name: booking.schedule.studio.name,
                type: booking.schedule.studio.type,
            },
        },
        source: booking.userId ? "registered_user" : "walk_in",
        status: booking.status,
        totalPrice: booking.totalPrice,
    };
}
async function buildBookingWhere(actor, filters) {
    const { start, end } = parsePeriod(filters);
    const resolvedLocationId = resolveLocationFilter(actor, filters.locationId);
    const where = {
        createdAt: {
            gte: start,
            lte: end,
        },
    };
    if (resolvedLocationId) {
        where.locationId = resolvedLocationId;
    }
    if (filters.packageId?.trim()) {
        where.packageId = filters.packageId.trim();
    }
    if (filters.studioId?.trim()) {
        where.schedule = {
            is: {
                studioId: filters.studioId.trim(),
            },
        };
    }
    return { end, resolvedLocationId, start, where };
}
async function loadBookings(actor, filters) {
    const { start, end, resolvedLocationId, where } = await buildBookingWhere(actor, filters);
    const bookings = await prisma.booking.findMany({
        where,
        include: reportBookingInclude,
        orderBy: [{ createdAt: "desc" }],
    });
    return {
        bookings,
        period: {
            end,
            start,
        },
        resolvedLocationId,
    };
}
async function loadStudios(actor, filters) {
    const resolvedLocationId = resolveLocationFilter(actor, filters.locationId);
    return prisma.studio.findMany({
        where: {
            isActive: true,
            ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
            ...(filters.studioId?.trim() ? { id: filters.studioId.trim() } : {}),
        },
        include: {
            location: true,
        },
        orderBy: [{ location: { name: "asc" } }, { type: "asc" }, { name: "asc" }],
    });
}
function summarizeBookingStatuses(bookings) {
    const counts = {
        cancelled: 0,
        completed: 0,
        confirmed: 0,
        expired: 0,
        pending: 0,
    };
    for (const booking of bookings) {
        counts[booking.status] += 1;
    }
    return counts;
}
function summarizePaymentStatuses(bookings) {
    const counts = {
        expired: 0,
        failed: 0,
        paid: 0,
        pending: 0,
    };
    for (const booking of bookings) {
        if (booking.payment) {
            counts[booking.payment.status] += 1;
        }
    }
    return counts;
}
function summarizePaymentMethods(bookings) {
    const counts = {
        bca_va: 0,
        cash: 0,
        gopay: 0,
        mandiri_va: 0,
        ovo: 0,
        qris: 0,
    };
    for (const booking of bookings) {
        if (booking.payment) {
            counts[booking.payment.method] += 1;
        }
    }
    return counts;
}
export const OperationsReportServices = {
    async getDashboardSummary(actor, filters) {
        const parsedPeriod = parsePeriod(filters);
        const [{ bookings, period, resolvedLocationId }, studios] = await Promise.all([
            loadBookings(actor, filters),
            loadStudios(actor, filters),
        ]);
        const auditLogCount = await prisma.auditLog.count({
            where: {
                createdAt: {
                    gte: parsedPeriod.start,
                    lte: parsedPeriod.end,
                },
                ...(resolvedLocationId
                    ? {
                        booking: {
                            locationId: resolvedLocationId,
                        },
                    }
                    : {}),
            },
        });
        const paidBookings = bookings.filter(item => item.payment?.status === "paid");
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const bookingTrendMap = new Map();
        for (let i = 6; i >= 0; i -= 1) {
            const d = startOfDay(new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), todayStart.getUTCDate() - i)));
            bookingTrendMap.set(d.toISOString().slice(0, 10), 0);
        }
        for (const booking of bookings) {
            const key = startOfDay(booking.createdAt).toISOString().slice(0, 10);
            if (bookingTrendMap.has(key)) {
                bookingTrendMap.set(key, (bookingTrendMap.get(key) ?? 0) + 1);
            }
        }
        const todayPayments = bookings.filter(item => item.payment &&
            item.payment.createdAt >= todayStart &&
            item.payment.createdAt <= todayEnd);
        const totalSchedules = await prisma.schedule.count({
            where: {
                date: {
                    gte: period.start,
                    lte: period.end,
                },
                studio: {
                    isActive: true,
                    ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
                    ...(filters.studioId?.trim() ? { id: filters.studioId.trim() } : {}),
                },
            },
        });
        const utilizedSchedules = await prisma.schedule.count({
            where: {
                date: {
                    gte: period.start,
                    lte: period.end,
                },
                studio: {
                    isActive: true,
                    ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
                    ...(filters.studioId?.trim() ? { id: filters.studioId.trim() } : {}),
                },
                booking: {
                    is: {
                        status: {
                            in: UTILIZED_BOOKING_STATUSES,
                        },
                        ...(filters.packageId?.trim() ? { packageId: filters.packageId.trim() } : {}),
                    },
                },
            },
        });
        return {
            scope: {
                locationId: resolvedLocationId,
                role: actor.role,
            },
            filters: {
                endDate: period.end.toISOString(),
                locationId: resolvedLocationId,
                packageId: filters.packageId?.trim() || null,
                startDate: period.start.toISOString(),
                studioId: filters.studioId?.trim() || null,
            },
            summary: {
                totalBookings: bookings.length,
                totalStudios: studios.length,
                totalTransactions: bookings.filter(item => item.payment).length,
                totalRevenuePaid: paidBookings.reduce((total, item) => total + (item.payment?.amount ?? 0), 0),
                bookingStatuses: summarizeBookingStatuses(bookings),
                paymentStatuses: summarizePaymentStatuses(bookings),
                dailyTransactions: {
                    count: todayPayments.length,
                    pendingCount: todayPayments.filter(item => item.payment?.status === "pending").length,
                    failedCount: todayPayments.filter(item => item.payment?.status === "failed").length,
                    paidAmount: todayPayments.reduce((total, item) => total + (item.payment?.status === "paid" ? item.payment.amount : 0), 0),
                },
                studioUsage: {
                    totalSchedules,
                    utilizedSchedules,
                    utilizationRate: totalSchedules === 0 ? 0 : toPercent((utilizedSchedules / totalSchedules) * 100),
                },
                cancellations: {
                    total: bookings.filter(item => item.status === "cancelled").length,
                    rate: bookings.length === 0 ? 0 : toPercent((bookings.filter(item => item.status === "cancelled").length / bookings.length) * 100),
                },
                bookingTrend: Array.from(bookingTrendMap.entries()).map(([label, value]) => ({
                    label,
                    value,
                })),
                adminActivityCount: auditLogCount,
            },
        };
    },
    async getBookingReport(actor, filters) {
        const { bookings, period, resolvedLocationId } = await loadBookings(actor, filters);
        const normalizedStatus = filters.bookingStatus?.trim();
        if (normalizedStatus && !isBookingStatus(normalizedStatus)) {
            throw new Error("Status booking tidak valid");
        }
        const filteredBookings = normalizedStatus && isBookingStatus(normalizedStatus)
            ? bookings.filter(item => item.status === normalizedStatus)
            : bookings;
        return {
            scope: {
                locationId: resolvedLocationId,
                role: actor.role,
            },
            filters: {
                bookingStatus: normalizedStatus || null,
                endDate: period.end.toISOString(),
                locationId: resolvedLocationId,
                packageId: filters.packageId?.trim() || null,
                startDate: period.start.toISOString(),
                studioId: filters.studioId?.trim() || null,
            },
            summary: {
                byStatus: summarizeBookingStatuses(filteredBookings),
                total: filteredBookings.length,
            },
            bookings: filteredBookings.map(serializeBookingRecord),
        };
    },
    async getStudioUsageReport(actor, filters) {
        const { start, end } = parsePeriod(filters);
        const resolvedLocationId = resolveLocationFilter(actor, filters.locationId);
        const normalizedGroupBy = filters.groupBy === "weekly" || filters.groupBy === "monthly" ? filters.groupBy : "daily";
        const [studios, schedules] = await Promise.all([
            loadStudios(actor, filters),
            prisma.schedule.findMany({
                where: {
                    date: {
                        gte: start,
                        lte: end,
                    },
                    studio: {
                        isActive: true,
                        ...(resolvedLocationId ? { locationId: resolvedLocationId } : {}),
                        ...(filters.studioId?.trim() ? { id: filters.studioId.trim() } : {}),
                    },
                    ...(filters.packageId?.trim()
                        ? {
                            booking: {
                                is: {
                                    packageId: filters.packageId.trim(),
                                },
                            },
                        }
                        : {}),
                },
                include: {
                    studio: true,
                    booking: {
                        include: {
                            package: true,
                        },
                    },
                },
                orderBy: [{ date: "asc" }, { startTime: "asc" }],
            }),
        ]);
        const byStudio = studios.map(studio => {
            const studioSchedules = schedules.filter(item => item.studioId === studio.id);
            const utilized = studioSchedules.filter(item => item.booking && UTILIZED_BOOKING_STATUSES.includes(item.booking.status)).length;
            return {
                location: studio.location.name,
                studio: {
                    id: studio.id,
                    name: studio.name,
                    type: studio.type,
                },
                totalSchedules: studioSchedules.length,
                utilizedSchedules: utilized,
                utilizationRate: studioSchedules.length === 0 ? 0 : toPercent((utilized / studioSchedules.length) * 100),
            };
        });
        const trendMap = new Map();
        for (const schedule of schedules) {
            const label = buildPeriodLabel(schedule.date, normalizedGroupBy);
            const entry = trendMap.get(label) ?? {
                totalSchedules: 0,
                utilizedSchedules: 0,
            };
            entry.totalSchedules += 1;
            if (schedule.booking && UTILIZED_BOOKING_STATUSES.includes(schedule.booking.status)) {
                entry.utilizedSchedules += 1;
            }
            trendMap.set(label, entry);
        }
        return {
            scope: {
                locationId: resolvedLocationId,
                role: actor.role,
            },
            filters: {
                endDate: end.toISOString(),
                groupBy: normalizedGroupBy,
                locationId: resolvedLocationId,
                packageId: filters.packageId?.trim() || null,
                startDate: start.toISOString(),
                studioId: filters.studioId?.trim() || null,
            },
            summary: {
                totalStudios: studios.length,
                totalSchedules: schedules.length,
                utilizedSchedules: schedules.filter(item => item.booking && UTILIZED_BOOKING_STATUSES.includes(item.booking.status)).length,
            },
            byStudio,
            trend: Array.from(trendMap.entries()).map(([periodLabel, values]) => ({
                periodLabel,
                totalSchedules: values.totalSchedules,
                utilizedSchedules: values.utilizedSchedules,
                utilizationRate: values.totalSchedules === 0 ? 0 : toPercent((values.utilizedSchedules / values.totalSchedules) * 100),
            })),
        };
    },
    async getPaymentReport(actor, filters) {
        const { bookings, period, resolvedLocationId } = await loadBookings(actor, filters);
        const normalizedStatus = filters.paymentStatus?.trim();
        const normalizedMethod = filters.paymentMethod?.trim();
        if (normalizedStatus && !isPaymentStatus(normalizedStatus)) {
            throw new Error("Status pembayaran tidak valid");
        }
        if (normalizedMethod && !isPaymentMethod(normalizedMethod)) {
            throw new Error("Metode pembayaran tidak valid");
        }
        const paymentRows = bookings
            .filter(item => item.payment)
            .filter(item => (normalizedStatus ? item.payment?.status === normalizedStatus : true))
            .filter(item => (normalizedMethod ? item.payment?.method === normalizedMethod : true))
            .map(item => ({
            bookingCode: item.bookingCode,
            bookingId: item.id,
            customerName: item.customerName,
            location: item.location.name,
            packageName: item.package.name,
            payment: {
                amount: item.payment.amount,
                createdAt: item.payment.createdAt.toISOString(),
                expiredAt: item.payment.expiredAt?.toISOString() ?? null,
                gatewayReference: item.payment.gatewayReference,
                id: item.payment.id,
                method: item.payment.method,
                paidAt: item.payment.paidAt?.toISOString() ?? null,
                status: item.payment.status,
            },
            studioName: item.schedule.studio.name,
        }));
        return {
            scope: {
                locationId: resolvedLocationId,
                role: actor.role,
            },
            filters: {
                endDate: period.end.toISOString(),
                locationId: resolvedLocationId,
                packageId: filters.packageId?.trim() || null,
                paymentMethod: normalizedMethod || null,
                paymentStatus: normalizedStatus || null,
                startDate: period.start.toISOString(),
                studioId: filters.studioId?.trim() || null,
            },
            summary: {
                byMethod: summarizePaymentMethods(bookings.filter(item => item.payment).filter(item => !normalizedStatus || item.payment?.status === normalizedStatus)),
                byStatus: summarizePaymentStatuses(bookings.filter(item => item.payment).filter(item => !normalizedMethod || item.payment?.method === normalizedMethod)),
                totalAmount: paymentRows.reduce((total, row) => total + row.payment.amount, 0),
                totalPaidAmount: paymentRows.reduce((total, row) => total + (row.payment.status === "paid" ? row.payment.amount : 0), 0),
                totalTransactions: paymentRows.length,
            },
            payments: paymentRows,
        };
    },
    async getPerformanceReport(actor, filters) {
        const [{ bookings, period, resolvedLocationId }, studioUsage] = await Promise.all([
            loadBookings(actor, filters),
            this.getStudioUsageReport(actor, {
                ...filters,
                groupBy: "daily",
            }),
        ]);
        const totalBookings = bookings.length;
        const cancelledBookings = bookings.filter(item => item.status === "cancelled").length;
        const completedBookings = bookings.filter(item => item.status === "completed").length;
        const paidBookings = bookings.filter(item => item.payment?.status === "paid").length;
        const paymentTransactions = bookings.filter(item => item.payment).length;
        return {
            scope: {
                locationId: resolvedLocationId,
                role: actor.role,
            },
            filters: {
                endDate: period.end.toISOString(),
                locationId: resolvedLocationId,
                packageId: filters.packageId?.trim() || null,
                startDate: period.start.toISOString(),
                studioId: filters.studioId?.trim() || null,
            },
            summary: {
                totalBookings,
                cancellationRate: totalBookings === 0 ? 0 : toPercent((cancelledBookings / totalBookings) * 100),
                completionRate: totalBookings === 0 ? 0 : toPercent((completedBookings / totalBookings) * 100),
                paymentSuccessRate: paymentTransactions === 0 ? 0 : toPercent((paidBookings / paymentTransactions) * 100),
                studioUtilizationRate: studioUsage.summary.totalSchedules === 0
                    ? 0
                    : toPercent((studioUsage.summary.utilizedSchedules / studioUsage.summary.totalSchedules) * 100),
            },
            studioPerformance: studioUsage.byStudio,
            bookingStatusBreakdown: summarizeBookingStatuses(bookings),
            paymentStatusBreakdown: summarizePaymentStatuses(bookings),
        };
    },
    async getAdminActivityReport(actor, filters) {
        const { start, end } = parsePeriod(filters);
        const resolvedLocationId = resolveLocationFilter(actor, filters.locationId);
        const logs = await prisma.auditLog.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
                ...(filters.adminId?.trim() ? { userId: filters.adminId.trim() } : {}),
                ...(filters.action?.trim() ? { action: { contains: filters.action.trim(), mode: "insensitive" } } : {}),
                ...(resolvedLocationId
                    ? {
                        booking: {
                            locationId: resolvedLocationId,
                        },
                    }
                    : {}),
            },
            include: {
                booking: {
                    include: {
                        location: true,
                        schedule: {
                            include: {
                                studio: true,
                            },
                        },
                    },
                },
                user: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return {
            scope: {
                locationId: resolvedLocationId,
                role: actor.role,
            },
            filters: {
                action: filters.action?.trim() || null,
                adminId: filters.adminId?.trim() || null,
                endDate: end.toISOString(),
                locationId: resolvedLocationId,
                startDate: start.toISOString(),
            },
            summary: {
                totalLogs: logs.length,
                uniqueAdmins: new Set(logs.map(item => item.userId).filter(Boolean)).size,
            },
            activities: logs.map(log => ({
                action: log.action,
                admin: log.user
                    ? {
                        email: log.user.email,
                        id: log.user.id,
                        name: log.user.name,
                        role: log.user.role,
                    }
                    : null,
                booking: log.booking
                    ? {
                        bookingId: log.booking.id,
                        bookingCode: log.booking.bookingCode,
                        location: log.booking.location.name,
                        studioName: log.booking.schedule.studio.name,
                    }
                    : null,
                createdAt: log.createdAt.toISOString(),
                entityId: log.entityId,
                entityType: log.entityType,
                id: log.id,
                newData: log.newData,
                oldData: log.oldData,
            })),
        };
    },
};
//# sourceMappingURL=operations-report.service.js.map