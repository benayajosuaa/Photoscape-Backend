import { prisma } from '../utils/prisma.js';
const BOOKING_STATUS_VALUES = ['pending', 'confirmed', 'completed', 'cancelled', 'expired'];
const PAYMENT_METHOD_VALUES = ['qris', 'bca_va', 'mandiri_va', 'gopay', 'ovo', 'cash'];
const STUDIO_TYPE_VALUES = ['K1', 'K2', 'PHOTO_BOX', 'SELF_PHOTO'];
const UTILIZED_BOOKING_STATUSES = ['pending', 'confirmed', 'completed'];
function parseDateOnly(value) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Tanggal tidak valid');
    }
    return date;
}
function startOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
function endOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
function startOfMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}
function startOfWeek(date) {
    const normalized = startOfDay(date);
    const day = normalized.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    normalized.setUTCDate(normalized.getUTCDate() + diff);
    return normalized;
}
function toNumber(value) {
    return Number(value.toFixed(2));
}
function toPercent(numerator, denominator) {
    if (!denominator)
        return 0;
    return toNumber((numerator / denominator) * 100);
}
function parsePagination(filters) {
    const page = Math.max(1, Number(filters.page || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit || 10) || 10));
    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}
function isBookingStatus(value) {
    return BOOKING_STATUS_VALUES.includes(value);
}
function isPaymentMethod(value) {
    return PAYMENT_METHOD_VALUES.includes(value);
}
function isStudioType(value) {
    return STUDIO_TYPE_VALUES.includes(value);
}
function normalizePeriod(value) {
    if (value === 'daily' || value === 'weekly' || value === 'monthly') {
        return value;
    }
    return 'daily';
}
function parseLocationId(filters) {
    return filters.locationId?.trim() || null;
}
function parseServiceType(filters) {
    const value = filters.serviceType?.trim();
    if (!value)
        return null;
    if (!isStudioType(value)) {
        throw new Error('Jenis layanan tidak valid');
    }
    return value;
}
function parseRangeWithDefault(filters, fallbackPeriod) {
    const date = filters.date?.trim();
    const startDate = filters.startDate?.trim();
    const endDate = filters.endDate?.trim();
    if (date) {
        const parsed = parseDateOnly(date);
        return {
            period: 'daily',
            start: startOfDay(parsed),
            end: endOfDay(parsed),
        };
    }
    if (startDate || endDate) {
        const now = new Date();
        const start = startDate ? startOfDay(parseDateOnly(startDate)) : startOfMonth(now);
        const end = endDate ? endOfDay(parseDateOnly(endDate)) : endOfDay(now);
        if (end < start) {
            throw new Error('Rentang tanggal tidak valid');
        }
        return {
            period: normalizePeriod(filters.period),
            start,
            end,
        };
    }
    const now = new Date();
    const requestedPeriod = normalizePeriod(filters.period || fallbackPeriod);
    if (requestedPeriod === 'monthly') {
        return {
            period: requestedPeriod,
            start: startOfMonth(now),
            end: endOfDay(now),
        };
    }
    if (requestedPeriod === 'weekly') {
        return {
            period: requestedPeriod,
            start: startOfWeek(now),
            end: endOfDay(now),
        };
    }
    return {
        period: requestedPeriod,
        start: startOfDay(now),
        end: endOfDay(now),
    };
}
function parseExplicitScheduleRange(filters) {
    const date = filters.date?.trim();
    const startDate = filters.startDate?.trim();
    const endDate = filters.endDate?.trim();
    if (date) {
        const parsed = parseDateOnly(date);
        return {
            start: startOfDay(parsed),
            end: endOfDay(parsed),
        };
    }
    if (startDate || endDate) {
        const now = new Date();
        const start = startDate ? startOfDay(parseDateOnly(startDate)) : startOfMonth(now);
        const end = endDate ? endOfDay(parseDateOnly(endDate)) : endOfDay(now);
        if (end < start) {
            throw new Error('Rentang tanggal tidak valid');
        }
        return { start, end };
    }
    return null;
}
function buildPeriodLabel(date, groupBy) {
    if (groupBy === 'monthly') {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    if (groupBy === 'weekly') {
        return startOfWeek(date).toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
}
function buildStudioWhere(filters) {
    const locationId = parseLocationId(filters);
    const serviceType = parseServiceType(filters);
    const studioId = filters.studioId?.trim();
    const where = {
        isActive: true,
    };
    if (locationId) {
        where.locationId = locationId;
    }
    if (serviceType) {
        where.type = serviceType;
    }
    if (studioId) {
        where.id = studioId;
    }
    return where;
}
function buildBookingWhere(filters) {
    const where = {};
    const locationId = parseLocationId(filters);
    if (locationId) {
        where.locationId = locationId;
    }
    if (filters.status?.trim()) {
        const normalizedStatus = filters.status.trim();
        if (!isBookingStatus(normalizedStatus)) {
            throw new Error('Status booking tidak valid');
        }
        where.status = normalizedStatus;
    }
    const scheduleRange = parseExplicitScheduleRange(filters);
    const serviceType = parseServiceType(filters);
    const studioId = filters.studioId?.trim();
    const scheduleWhere = {};
    if (scheduleRange) {
        scheduleWhere.date = {
            gte: scheduleRange.start,
            lte: scheduleRange.end,
        };
    }
    if (studioId) {
        scheduleWhere.studioId = studioId;
    }
    if (serviceType) {
        scheduleWhere.studio = {
            is: {
                type: serviceType,
            },
        };
    }
    if (Object.keys(scheduleWhere).length > 0) {
        where.schedule = {
            is: scheduleWhere,
        };
    }
    return where;
}
export const ManagerReportServices = {
    async getFilterOptions(actor, filters) {
        const requestedLocationId = parseLocationId(filters);
        const scopedLocationId = requestedLocationId ?? null;
        const [locations, studios] = await Promise.all([
            prisma.location.findMany({
                orderBy: { name: 'asc' },
            }),
            prisma.studio.findMany({
                where: {
                    isActive: true,
                    ...(scopedLocationId ? { locationId: scopedLocationId } : {}),
                },
                include: {
                    location: true,
                },
                orderBy: [{ location: { name: 'asc' } }, { type: 'asc' }, { name: 'asc' }],
            }),
        ]);
        return {
            locations: locations.map((item) => ({
                id: item.id,
                name: item.name,
            })),
            serviceTypes: STUDIO_TYPE_VALUES,
            paymentMethods: PAYMENT_METHOD_VALUES,
            bookingStatuses: BOOKING_STATUS_VALUES,
            studios: studios.map((item) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                locationId: item.locationId,
                locationName: item.location.name,
            })),
        };
    },
    async getDailySummary(actor, filters) {
        const locationId = parseLocationId(filters);
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const [bookings, payments, totalSchedules, utilizedSchedules] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    createdAt: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                    ...(locationId ? { locationId } : {}),
                },
                include: {
                    payment: true,
                },
            }),
            prisma.payment.findMany({
                where: {
                    createdAt: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                    ...(locationId
                        ? {
                            booking: {
                                is: {
                                    locationId,
                                },
                            },
                        }
                        : {}),
                },
            }),
            prisma.schedule.count({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                    studio: {
                        isActive: true,
                        ...(locationId ? { locationId } : {}),
                    },
                },
            }),
            prisma.schedule.count({
                where: {
                    date: {
                        gte: todayStart,
                        lte: todayEnd,
                    },
                    studio: {
                        isActive: true,
                        ...(locationId ? { locationId } : {}),
                    },
                    booking: {
                        is: {
                            status: {
                                in: UTILIZED_BOOKING_STATUSES,
                            },
                        },
                    },
                },
            }),
        ]);
        const counts = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            expired: 0,
        };
        for (const booking of bookings) {
            counts[booking.status] += 1;
        }
        const paidRevenue = bookings.reduce((total, booking) => {
            if (booking.payment?.status === 'paid') {
                return total + booking.payment.amount;
            }
            return total;
        }, 0);
        const paidTransactions = payments.filter((item) => item.status === 'paid');
        return {
            date: todayStart.toISOString().slice(0, 10),
            totalBookings: bookings.length,
            pending: counts.pending,
            confirmed: counts.confirmed,
            completed: counts.completed,
            cancelled: counts.cancelled,
            totalRevenuePaid: toNumber(paidRevenue),
            totalTransactionsDaily: payments.length,
            totalPaidTransactionsDaily: paidTransactions.length,
            paidAmountDaily: toNumber(paidTransactions.reduce((total, item) => total + item.amount, 0)),
            totalSchedules,
            utilizedSchedules,
            studioUtilizationRate: toPercent(utilizedSchedules, totalSchedules),
        };
    },
    async getBookings(actor, filters) {
        const { page, limit, skip } = parsePagination(filters);
        const where = buildBookingWhere(filters);
        const [rows, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    location: true,
                    package: true,
                    payment: true,
                    schedule: {
                        include: {
                            studio: true,
                        },
                    },
                },
                orderBy: [{ schedule: { startTime: 'desc' } }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            prisma.booking.count({ where }),
        ]);
        return {
            scope: {
                role: actor.role,
                locationId: parseLocationId(filters) ?? null,
            },
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            bookings: rows.map((row) => ({
                bookingId: row.id,
                bookingCode: row.bookingCode,
                customerName: row.customerName,
                locationName: row.location.name,
                packageName: row.package.name,
                studioId: row.schedule.studio.id,
                studioName: row.schedule.studio.name,
                serviceType: row.schedule.studio.type,
                startTime: row.schedule.startTime.toISOString(),
                endTime: row.schedule.endTime.toISOString(),
                status: row.status,
                paymentStatus: row.payment?.status ?? 'pending',
            })),
        };
    },
    async getStudioUsage(actor, filters) {
        const { start, end, period } = parseRangeWithDefault(filters, 'daily');
        const schedules = await prisma.schedule.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end,
                },
                studio: buildStudioWhere(filters),
            },
            include: {
                studio: {
                    include: {
                        location: true,
                    },
                },
                booking: {
                    include: {
                        payment: true,
                    },
                },
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
        const studioMap = new Map();
        const trendMap = new Map();
        for (const schedule of schedules) {
            const key = schedule.studioId;
            const isUtilized = !!(schedule.booking && UTILIZED_BOOKING_STATUSES.includes(schedule.booking.status));
            const isCancelled = schedule.booking?.status === 'cancelled';
            const durationHours = (schedule.endTime.getTime() - schedule.startTime.getTime()) / (60 * 60 * 1000);
            const current = studioMap.get(key) ?? {
                studioId: schedule.studio.id,
                studioName: schedule.studio.name,
                serviceType: schedule.studio.type,
                locationName: schedule.studio.location.name,
                totalSchedules: 0,
                utilizedSchedules: 0,
                totalSessions: 0,
                totalHours: 0,
                totalRevenue: 0,
                totalCancelled: 0,
            };
            current.totalSchedules += 1;
            if (isUtilized) {
                current.utilizedSchedules += 1;
                current.totalSessions += 1;
                current.totalHours += durationHours;
            }
            if (schedule.booking?.payment?.status === 'paid') {
                current.totalRevenue += schedule.booking.payment.amount;
            }
            if (isCancelled) {
                current.totalCancelled += 1;
            }
            studioMap.set(key, current);
            const trendKey = buildPeriodLabel(schedule.date, period);
            const trend = trendMap.get(trendKey) ?? { totalSchedules: 0, utilizedSchedules: 0, cancelled: 0 };
            trend.totalSchedules += 1;
            if (isUtilized) {
                trend.utilizedSchedules += 1;
            }
            if (isCancelled) {
                trend.cancelled += 1;
            }
            trendMap.set(trendKey, trend);
        }
        const studioRows = Array.from(studioMap.values())
            .map((item) => ({
            ...item,
            totalHours: toNumber(item.totalHours),
            totalRevenue: toNumber(item.totalRevenue),
            utilizationRate: toPercent(item.utilizedSchedules, item.totalSchedules),
        }))
            .sort((a, b) => b.totalSessions - a.totalSessions);
        const totalSchedules = schedules.length;
        const utilizedSchedules = schedules.filter((item) => item.booking && UTILIZED_BOOKING_STATUSES.includes(item.booking.status)).length;
        const cancelledBookings = schedules.filter((item) => item.booking?.status === 'cancelled').length;
        return {
            scope: {
                role: actor.role,
                locationId: parseLocationId(filters) ?? null,
            },
            period,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            summary: {
                totalStudios: studioRows.length,
                totalSchedules,
                utilizedSchedules,
                utilizationRate: toPercent(utilizedSchedules, totalSchedules),
                cancelledBookings,
            },
            studios: studioRows,
            trend: Array.from(trendMap.entries())
                .map(([periodLabel, values]) => ({
                periodLabel,
                totalSchedules: values.totalSchedules,
                utilizedSchedules: values.utilizedSchedules,
                utilizationRate: toPercent(values.utilizedSchedules, values.totalSchedules),
                cancelledBookings: values.cancelled,
            }))
                .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
        };
    },
    async getTransactions(actor, filters) {
        const { start, end, period } = parseRangeWithDefault(filters, 'monthly');
        const { page, limit, skip } = parsePagination(filters);
        const locationId = parseLocationId(filters);
        const serviceType = parseServiceType(filters);
        const studioId = filters.studioId?.trim();
        const where = {
            createdAt: {
                gte: start,
                lte: end,
            },
            booking: {
                is: {
                    ...(locationId ? { locationId } : {}),
                    ...(studioId || serviceType
                        ? {
                            schedule: {
                                is: {
                                    ...(studioId ? { studioId } : {}),
                                    ...(serviceType
                                        ? {
                                            studio: {
                                                is: {
                                                    type: serviceType,
                                                },
                                            },
                                        }
                                        : {}),
                                },
                            },
                        }
                        : {}),
                },
            },
        };
        if (filters.method?.trim()) {
            const method = filters.method.trim();
            if (!isPaymentMethod(method)) {
                throw new Error('Metode pembayaran tidak valid');
            }
            where.method = method;
        }
        const [rows, total, allRows] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    booking: {
                        include: {
                            location: true,
                            package: true,
                            schedule: {
                                include: {
                                    studio: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.payment.count({ where }),
            prisma.payment.findMany({
                where,
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
                },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        const summary = rows.reduce((acc, row) => {
            acc.totalAmount += row.amount;
            acc.totalTransactions += 1;
            if (row.status === 'paid') {
                acc.paidAmount += row.amount;
                acc.paidCount += 1;
            }
            if (row.status === 'pending') {
                acc.pendingCount += 1;
            }
            if (row.status === 'failed' || row.status === 'expired') {
                acc.failedCount += 1;
            }
            return acc;
        }, {
            totalAmount: 0,
            totalTransactions: 0,
            paidAmount: 0,
            paidCount: 0,
            pendingCount: 0,
            failedCount: 0,
        });
        const trendMap = new Map();
        const locationMap = new Map();
        const methodMap = new Map();
        const statusMap = new Map();
        for (const row of allRows) {
            const trendKey = buildPeriodLabel(row.createdAt, period);
            const trendItem = trendMap.get(trendKey) ?? {
                totalTransactions: 0,
                paidTransactions: 0,
                totalAmount: 0,
                paidAmount: 0,
            };
            trendItem.totalTransactions += 1;
            trendItem.totalAmount += row.amount;
            if (row.status === 'paid') {
                trendItem.paidTransactions += 1;
                trendItem.paidAmount += row.amount;
            }
            trendMap.set(trendKey, trendItem);
            const locationKey = row.booking.locationId;
            const locationItem = locationMap.get(locationKey) ?? {
                locationId: locationKey,
                locationName: row.booking.location.name,
                totalTransactions: 0,
                totalAmount: 0,
                paidTransactions: 0,
                paidAmount: 0,
            };
            locationItem.totalTransactions += 1;
            locationItem.totalAmount += row.amount;
            if (row.status === 'paid') {
                locationItem.paidTransactions += 1;
                locationItem.paidAmount += row.amount;
            }
            locationMap.set(locationKey, locationItem);
            const methodItem = methodMap.get(row.method) ?? {
                method: row.method,
                totalTransactions: 0,
                totalAmount: 0,
            };
            methodItem.totalTransactions += 1;
            methodItem.totalAmount += row.amount;
            methodMap.set(row.method, methodItem);
            const statusItem = statusMap.get(row.status) ?? {
                status: row.status,
                totalTransactions: 0,
                totalAmount: 0,
            };
            statusItem.totalTransactions += 1;
            statusItem.totalAmount += row.amount;
            statusMap.set(row.status, statusItem);
        }
        return {
            scope: {
                role: actor.role,
                locationId,
            },
            filters: {
                period,
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                method: filters.method?.trim() || null,
                studioId: studioId || null,
                serviceType,
            },
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            summary: {
                ...summary,
                totalAmount: toNumber(summary.totalAmount),
                paidAmount: toNumber(summary.paidAmount),
            },
            analytics: {
                period,
                trend: Array.from(trendMap.entries())
                    .map(([periodLabel, values]) => ({
                    periodLabel,
                    totalTransactions: values.totalTransactions,
                    paidTransactions: values.paidTransactions,
                    totalAmount: toNumber(values.totalAmount),
                    paidAmount: toNumber(values.paidAmount),
                }))
                    .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
                byLocation: Array.from(locationMap.values())
                    .map((item) => ({
                    ...item,
                    totalAmount: toNumber(item.totalAmount),
                    paidAmount: toNumber(item.paidAmount),
                }))
                    .sort((a, b) => b.totalAmount - a.totalAmount),
                byMethod: Array.from(methodMap.values())
                    .map((item) => ({
                    ...item,
                    totalAmount: toNumber(item.totalAmount),
                }))
                    .sort((a, b) => b.totalAmount - a.totalAmount),
                byStatus: Array.from(statusMap.values())
                    .map((item) => ({
                    ...item,
                    totalAmount: toNumber(item.totalAmount),
                }))
                    .sort((a, b) => b.totalTransactions - a.totalTransactions),
            },
            transactions: rows.map((row) => ({
                transactionId: row.id,
                transactionCode: row.gatewayReference || `TX-${row.id.slice(0, 8).toUpperCase()}`,
                bookingCode: row.booking.bookingCode,
                customerName: row.booking.customerName,
                locationName: row.booking.location.name,
                packageName: row.booking.package.name,
                studioId: row.booking.schedule.studio.id,
                studioName: row.booking.schedule.studio.name,
                serviceType: row.booking.schedule.studio.type,
                method: row.method,
                amount: row.amount,
                status: row.status,
                createdAt: row.createdAt.toISOString(),
            })),
        };
    },
    async getActivityLogs(actor, filters) {
        const { start, end } = parseRangeWithDefault(filters, 'weekly');
        const { page, limit, skip } = parsePagination(filters);
        const locationId = parseLocationId(filters);
        const serviceType = parseServiceType(filters);
        const studioId = filters.studioId?.trim();
        const where = {
            createdAt: {
                gte: start,
                lte: end,
            },
            user: {
                is: {
                    role: 'admin',
                },
            },
        };
        if (filters.action?.trim()) {
            where.action = {
                contains: filters.action.trim(),
                mode: 'insensitive',
            };
        }
        if (locationId || serviceType || studioId) {
            where.booking = {
                is: {
                    ...(locationId ? { locationId } : {}),
                    ...(studioId || serviceType
                        ? {
                            schedule: {
                                is: {
                                    ...(studioId ? { studioId } : {}),
                                    ...(serviceType
                                        ? {
                                            studio: {
                                                is: {
                                                    type: serviceType,
                                                },
                                            },
                                        }
                                        : {}),
                                },
                            },
                        }
                        : {}),
                },
            };
        }
        const [rows, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: true,
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
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.auditLog.count({ where }),
        ]);
        return {
            scope: {
                role: actor.role,
                locationId,
            },
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            logs: rows.map((row) => ({
                id: row.id,
                action: row.action,
                entityType: row.entityType,
                entityId: row.entityId,
                bookingCode: row.booking?.bookingCode ?? null,
                adminId: row.user?.id ?? null,
                adminName: row.user?.name ?? '-',
                locationName: row.booking?.location.name ?? null,
                studioName: row.booking?.schedule.studio.name ?? null,
                serviceType: row.booking?.schedule.studio.type ?? null,
                createdAt: row.createdAt.toISOString(),
            })),
        };
    },
    async getPerformanceStats(actor, filters) {
        const { start, end } = parseRangeWithDefault(filters, 'monthly');
        const nextFilters = {
            ...filters,
            startDate: start.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
        };
        const bookingWhere = buildBookingWhere(nextFilters);
        const [bookings, totalSchedules, utilizedSchedules] = await Promise.all([
            prisma.booking.findMany({
                where: bookingWhere,
                include: {
                    package: true,
                    schedule: {
                        include: {
                            studio: true,
                        },
                    },
                },
            }),
            prisma.schedule.count({
                where: {
                    date: {
                        gte: start,
                        lte: end,
                    },
                    studio: buildStudioWhere(filters),
                },
            }),
            prisma.schedule.count({
                where: {
                    date: {
                        gte: start,
                        lte: end,
                    },
                    studio: buildStudioWhere(filters),
                    booking: {
                        is: {
                            status: {
                                in: UTILIZED_BOOKING_STATUSES,
                            },
                        },
                    },
                },
            }),
        ]);
        const perDayMap = new Map();
        const cursor = startOfDay(start);
        while (cursor <= end) {
            perDayMap.set(cursor.toISOString().slice(0, 10), 0);
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        const studioMap = new Map();
        const packageMap = new Map();
        let cancelledCount = 0;
        for (const booking of bookings) {
            const dayKey = booking.createdAt.toISOString().slice(0, 10);
            if (perDayMap.has(dayKey)) {
                perDayMap.set(dayKey, (perDayMap.get(dayKey) || 0) + 1);
            }
            if (booking.status === 'cancelled') {
                cancelledCount += 1;
            }
            const studioKey = booking.schedule.studio.id;
            const studio = studioMap.get(studioKey) ?? {
                studioId: studioKey,
                studioName: booking.schedule.studio.name,
                total: 0,
            };
            studio.total += 1;
            studioMap.set(studioKey, studio);
            const packageKey = booking.package.id;
            const pkg = packageMap.get(packageKey) ?? {
                packageId: packageKey,
                packageName: booking.package.name,
                total: 0,
            };
            pkg.total += 1;
            packageMap.set(packageKey, pkg);
        }
        const bookingPerDay = Array.from(perDayMap.entries())
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return {
            range: {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            },
            summary: {
                totalBookings: bookings.length,
                cancelledCount,
                cancellationRate: toPercent(cancelledCount, bookings.length),
                totalSchedules,
                utilizedSchedules,
                studioUtilizationRate: toPercent(utilizedSchedules, totalSchedules),
            },
            bookingPerDay,
            topStudios: Array.from(studioMap.values()).sort((a, b) => b.total - a.total).slice(0, 5),
            topPackages: Array.from(packageMap.values()).sort((a, b) => b.total - a.total).slice(0, 5),
        };
    },
};
//# sourceMappingURL=manager-report.service.js.map