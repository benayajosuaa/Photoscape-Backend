import { prisma } from "../utils/prisma.js";
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "completed"];
import { PENDING_BOOKING_WINDOW_MINUTES, PAYMENT_METHODS, VA_AUTO_SUCCESS_SECONDS, buildPaymentExpiry, buildQrisPaymentPageUrl, confirmQrisPaymentFromPage, finalizePaidBooking, getPaymentInstructions, getQrisPaymentPage, isPaymentMethod, isVirtualAccountMethod, syncBookingPayments, } from "./payment.services.js";
function isStudioType(value) {
    return ["K1", "K2", "PHOTO_BOX", "SELF_PHOTO"].includes(value);
}
function startOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
function endOfDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
function parseDateOnly(value) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
        throw new Error("Tanggal tidak valid");
    }
    return date;
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
function formatMoney(value) {
    return Number(value.toFixed(2));
}
function parseDateTime(value, fieldName) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${fieldName} tidak valid`);
    }
    return date;
}
function startOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}
function endOfUtcDay(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
function startOfUtcWeek(date) {
    const day = date.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    return startOfUtcDay(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff)));
}
function endOfUtcWeek(date) {
    const start = startOfUtcWeek(date);
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
}
function startOfUtcMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}
function endOfUtcMonth(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}
function addUtcDays(date, days) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
}
function addUtcMonths(date, months) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
}
function isRevenueGroupBy(value) {
    return ["daily", "weekly", "monthly"].includes(value);
}
function buildRevenuePeriodBounds(groupBy, current) {
    if (groupBy === "daily") {
        return {
            periodStart: startOfUtcDay(current),
            periodEnd: endOfUtcDay(current),
            nextCursor: addUtcDays(startOfUtcDay(current), 1),
            label: startOfUtcDay(current).toISOString().slice(0, 10),
        };
    }
    if (groupBy === "weekly") {
        const periodStart = startOfUtcWeek(current);
        return {
            periodStart,
            periodEnd: endOfUtcWeek(current),
            nextCursor: addUtcDays(periodStart, 7),
            label: `${periodStart.toISOString().slice(0, 10)}_week`,
        };
    }
    const periodStart = startOfUtcMonth(current);
    return {
        periodStart,
        periodEnd: endOfUtcMonth(current),
        nextCursor: addUtcMonths(periodStart, 1),
        label: periodStart.toISOString().slice(0, 7),
    };
}
function buildBookingCode() {
    const now = new Date();
    const year = String(now.getUTCFullYear()).slice(-2);
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `PS-${year}${month}${day}-${random}`;
}
function ensurePositiveQuantity(quantity) {
    const normalized = quantity ?? 1;
    if (!Number.isInteger(normalized) || normalized < 1) {
        throw new Error("Quantity add-on tidak valid");
    }
    return normalized;
}
async function getBookingOwnedByUser(userId, bookingId) {
    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            userId,
        },
        include: {
            location: true,
            package: true,
            schedule: {
                include: {
                    studio: true,
                },
            },
            addOns: {
                include: {
                    addOn: true,
                },
            },
            payment: true,
            ticket: true,
        },
    });
    if (!booking) {
        throw new Error("Booking tidak ditemukan");
    }
    return booking;
}
async function createAuditLog(tx, params) {
    const data = {
        action: params.action,
        entityType: "booking",
        entityId: params.bookingId,
        bookingId: params.bookingId,
        userId: params.userId ?? null,
        ...(params.oldData !== undefined ? { oldData: params.oldData } : {}),
        ...(params.newData !== undefined ? { newData: params.newData } : {}),
    };
    await tx.auditLog.create({
        data,
    });
}
function getBookingSource() {
    return "online";
}
function buildIssueFlags(booking) {
    const issues = [];
    if (booking.status === "cancelled") {
        issues.push("booking_cancelled");
    }
    if (booking.status === "expired") {
        issues.push("booking_expired");
    }
    if (booking.payment?.status === "failed" || booking.payment?.status === "expired") {
        issues.push("payment_problem");
    }
    if (booking.status === "pending" && booking.payment?.status === "pending") {
        issues.push("awaiting_payment");
    }
    return issues;
}
function mapAdminBookingListItem(booking) {
    const latestAudit = booking.auditLogs[0] ?? null;
    return {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        source: getBookingSource(),
        status: booking.status,
        issueFlags: buildIssueFlags(booking),
        customer: {
            name: booking.customerName,
            phone: booking.customerPhone,
            accountName: booking.user?.name ?? null,
            accountEmail: booking.user?.email ?? null,
        },
        bookingContext: {
            location: booking.location.name,
            package: booking.package.name,
            studio: booking.schedule.studio.name,
            studioType: booking.schedule.studio.type,
            date: booking.schedule.date.toISOString(),
            startTime: booking.schedule.startTime.toISOString(),
            endTime: booking.schedule.endTime.toISOString(),
            participantCount: booking.participantCount,
        },
        payment: {
            totalPrice: booking.totalPrice,
            paymentStatus: booking.payment?.status ?? null,
            paymentMethod: booking.payment?.method ?? null,
            paidAmount: booking.payment?.status === "paid" ? booking.payment.amount : 0,
            gatewayReference: booking.payment?.gatewayReference ?? null,
        },
        handledBy: booking.creator
            ? {
                id: booking.creator.id,
                name: booking.creator.name,
                email: booking.creator.email,
            }
            : null,
        lastAudit: latestAudit
            ? {
                action: latestAudit.action,
                at: latestAudit.createdAt.toISOString(),
                actorName: latestAudit.user?.name ?? null,
            }
            : null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
    };
}
function calculateAddOnTotal(addOns) {
    return addOns.reduce((total, item) => total + item.addOn.price * item.quantity, 0);
}
function toSummaryResponse(booking) {
    const addOnTotal = calculateAddOnTotal(booking.addOns);
    return {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        customer: {
            name: booking.customerName,
            phone: booking.customerPhone,
        },
        location: {
            id: booking.location.id,
            name: booking.location.name,
        },
        package: {
            id: booking.package.id,
            name: booking.package.name,
            price: booking.package.price,
            durationMinutes: booking.package.durationMinutes,
        },
        studio: {
            id: booking.schedule.studio.id,
            name: booking.schedule.studio.name,
            type: booking.schedule.studio.type,
        },
        schedule: {
            id: booking.schedule.id,
            date: booking.schedule.date.toISOString(),
            startTime: booking.schedule.startTime.toISOString(),
            endTime: booking.schedule.endTime.toISOString(),
        },
        participantCount: booking.participantCount,
        addOns: booking.addOns.map(item => ({
            id: item.addOn.id,
            name: item.addOn.name,
            quantity: item.quantity,
            unitPrice: item.addOn.price,
            subtotal: formatMoney(item.addOn.price * item.quantity),
        })),
        pricing: {
            packagePrice: booking.package.price,
            addOnTotal: formatMoney(addOnTotal),
            totalPrice: booking.totalPrice,
        },
        payment: booking.payment
            ? {
                id: booking.payment.id,
                method: booking.payment.method,
                status: booking.payment.status,
                amount: booking.payment.amount,
                expiredAt: booking.payment.expiredAt?.toISOString() ?? null,
                paidAt: booking.payment.paidAt?.toISOString() ?? null,
                gatewayReference: booking.payment.gatewayReference,
            }
            : null,
        ticket: booking.ticket
            ? {
                id: booking.ticket.id,
                qrCode: booking.ticket.qrCode,
                status: booking.ticket.status,
                issuedAt: booking.ticket.issuedAt.toISOString(),
                expiredAt: booking.ticket.expiredAt.toISOString(),
            }
            : null,
    };
}
export const BookingServices = {
    async getMeta(params) {
        await syncBookingPayments();
        const wherePackage = {};
        const whereStudio = {
            isActive: true,
        };
        if (params.locationId) {
            whereStudio.locationId = params.locationId;
        }
        if (params.studioType) {
            if (!isStudioType(params.studioType)) {
                throw new Error("Jenis studio tidak valid");
            }
            whereStudio.type = params.studioType;
        }
        const [locations, studios, packages, addOns] = await Promise.all([
            prisma.location.findMany({
                orderBy: { name: "asc" },
            }),
            prisma.studio.findMany({
                where: whereStudio,
                orderBy: [{ type: "asc" }, { name: "asc" }],
            }),
            prisma.photoPackage.findMany({
                where: wherePackage,
                orderBy: [{ durationMinutes: "asc" }, { price: "asc" }],
            }),
            prisma.addOn.findMany({
                orderBy: { name: "asc" },
            }),
        ]);
        return {
            locations,
            studioTypes: ["K1", "K2", "PHOTO_BOX", "SELF_PHOTO"],
            studios,
            packages,
            addOns,
            paymentMethods: PAYMENT_METHODS,
            bookingWindowMinutes: PENDING_BOOKING_WINDOW_MINUTES,
        };
    },
    async getAvailability(params) {
        await syncBookingPayments();
        if (!params.locationId)
            throw new Error("locationId wajib diisi");
        if (!params.packageId)
            throw new Error("packageId wajib diisi");
        if (!params.date)
            throw new Error("date wajib diisi");
        if (!params.studioType)
            throw new Error("studioType wajib diisi");
        if (!isStudioType(params.studioType))
            throw new Error("Jenis studio tidak valid");
        const date = parseDateOnly(params.date);
        const [photoPackage, location, studios] = await Promise.all([
            prisma.photoPackage.findUnique({
                where: { id: params.packageId },
            }),
            prisma.location.findUnique({
                where: { id: params.locationId },
            }),
            prisma.studio.findMany({
                where: {
                    isActive: true,
                    locationId: params.locationId,
                    type: params.studioType,
                },
                orderBy: { name: "asc" },
            }),
        ]);
        if (!photoPackage)
            throw new Error("Paket tidak ditemukan");
        if (!location)
            throw new Error("Lokasi tidak ditemukan");
        const schedules = await prisma.schedule.findMany({
            where: {
                date: {
                    gte: startOfDay(date),
                    lte: endOfDay(date),
                },
                studio: {
                    isActive: true,
                    locationId: params.locationId,
                    type: params.studioType,
                },
            },
            include: {
                studio: true,
                booking: {
                    include: {
                        payment: true,
                    },
                },
            },
            orderBy: [{ startTime: "asc" }, { studio: { name: "asc" } }],
        });
        const now = new Date();
        const slots = schedules.map(schedule => {
            const booking = schedule.booking;
            const isPast = schedule.startTime <= now;
            const hasLongEnoughDuration = schedule.endTime.getTime() - schedule.startTime.getTime() >= photoPackage.durationMinutes * 60 * 1000;
            const bookingBlocksSlot = Boolean(booking &&
                ACTIVE_BOOKING_STATUSES.includes(booking.status) &&
                (booking.status !== "pending" || addMinutes(booking.createdAt, PENDING_BOOKING_WINDOW_MINUTES) > now));
            let status = "available";
            let reason = null;
            if (isPast) {
                status = "unavailable";
                reason = "Jadwal sudah lewat";
            }
            else if (!hasLongEnoughDuration) {
                status = "unavailable";
                reason = "Durasi slot tidak cukup untuk paket ini";
            }
            else if (bookingBlocksSlot) {
                status = "unavailable";
                reason = "Slot sudah terisi";
            }
            return {
                scheduleId: schedule.id,
                studioId: schedule.studio.id,
                studioName: schedule.studio.name,
                studioType: schedule.studio.type,
                startTime: schedule.startTime.toISOString(),
                endTime: schedule.endTime.toISOString(),
                status,
                reason,
            };
        });
        return {
            location,
            date: startOfDay(date).toISOString(),
            package: {
                id: photoPackage.id,
                name: photoPackage.name,
                durationMinutes: photoPackage.durationMinutes,
                price: photoPackage.price,
                maxCapacity: photoPackage.maxCapacity,
            },
            studioType: params.studioType,
            studios,
            slots,
            availableSlots: slots.filter(slot => slot.status === "available"),
        };
    },
    async createBooking(userId, payload) {
        await syncBookingPayments();
        const customerName = String(payload.customerName ?? "").trim();
        const customerPhone = String(payload.customerPhone ?? "").trim();
        const locationId = String(payload.locationId ?? "").trim();
        const packageId = String(payload.packageId ?? "").trim();
        const studioType = String(payload.studioType ?? "").trim();
        const scheduleId = String(payload.scheduleId ?? "").trim();
        const participantCount = Number(payload.participantCount ?? 1);
        const addOnsPayload = Array.isArray(payload.addOns) ? payload.addOns : [];
        if (!customerName || customerName.length < 2)
            throw new Error("Nama customer minimal 2 karakter");
        if (!customerPhone || customerPhone.length < 8)
            throw new Error("Nomor HP tidak valid");
        if (!locationId)
            throw new Error("locationId wajib diisi");
        if (!packageId)
            throw new Error("packageId wajib diisi");
        if (!scheduleId)
            throw new Error("scheduleId wajib diisi");
        if (!isStudioType(studioType))
            throw new Error("Jenis studio tidak valid");
        if (!Number.isInteger(participantCount) || participantCount < 1)
            throw new Error("participantCount tidak valid");
        return prisma.$transaction(async (tx) => {
            const [photoPackage, schedule, user] = await Promise.all([
                tx.photoPackage.findUnique({
                    where: { id: packageId },
                }),
                tx.schedule.findUnique({
                    where: { id: scheduleId },
                    include: {
                        studio: true,
                        booking: {
                            include: {
                                payment: true,
                            },
                        },
                    },
                }),
                tx.user.findUnique({
                    where: { id: userId },
                }),
            ]);
            if (!user)
                throw new Error("User tidak ditemukan");
            if (!photoPackage)
                throw new Error("Paket tidak ditemukan");
            if (!schedule)
                throw new Error("Jadwal tidak ditemukan");
            if (schedule.studio.locationId !== locationId)
                throw new Error("Jadwal tidak sesuai dengan lokasi yang dipilih");
            if (schedule.studio.type !== studioType)
                throw new Error("Jadwal tidak sesuai dengan jenis studio yang dipilih");
            if (!schedule.studio.isActive)
                throw new Error("Studio sedang tidak aktif");
            if (schedule.startTime <= new Date())
                throw new Error("Jadwal yang dipilih sudah lewat");
            if (participantCount > photoPackage.maxCapacity)
                throw new Error("Jumlah peserta melebihi kapasitas paket");
            const slotDurationMinutes = (schedule.endTime.getTime() - schedule.startTime.getTime()) / (60 * 1000);
            if (slotDurationMinutes < photoPackage.durationMinutes) {
                throw new Error("Durasi slot tidak cukup untuk paket yang dipilih");
            }
            if (schedule.booking &&
                ACTIVE_BOOKING_STATUSES.includes(schedule.booking.status) &&
                (schedule.booking.status !== "pending" ||
                    addMinutes(schedule.booking.createdAt, PENDING_BOOKING_WINDOW_MINUTES) > new Date())) {
                throw new Error("Slot sudah dipesan user lain");
            }
            const addOnIds = addOnsPayload.map(item => item.addOnId);
            const addOns = addOnIds.length
                ? await tx.addOn.findMany({
                    where: {
                        id: {
                            in: addOnIds,
                        },
                    },
                })
                : [];
            if (addOns.length !== addOnIds.length) {
                throw new Error("Ada add-on yang tidak ditemukan");
            }
            const addOnById = new Map(addOns.map(item => [item.id, item]));
            const normalizedAddOns = addOnsPayload.map(item => {
                const addOn = addOnById.get(item.addOnId);
                if (!addOn) {
                    throw new Error("Ada add-on yang tidak ditemukan");
                }
                return {
                    addOnId: item.addOnId,
                    quantity: ensurePositiveQuantity(item.quantity),
                    price: addOn.price,
                };
            });
            const addOnTotal = normalizedAddOns.reduce((total, item) => total + item.price * item.quantity, 0);
            const totalPrice = formatMoney(photoPackage.price + addOnTotal);
            const createData = {
                bookingCode: buildBookingCode(),
                customerName,
                customerPhone,
                participantCount,
                totalPrice,
                status: "pending",
                userId: user.id,
                scheduleId: schedule.id,
                packageId: photoPackage.id,
                locationId,
            };
            const booking = await tx.booking.create({
                data: normalizedAddOns.length
                    ? {
                        ...createData,
                        addOns: {
                            create: normalizedAddOns.map(item => ({
                                addOnId: item.addOnId,
                                quantity: item.quantity,
                            })),
                        },
                    }
                    : createData,
                include: {
                    location: true,
                    package: true,
                    schedule: {
                        include: {
                            studio: true,
                        },
                    },
                    addOns: {
                        include: {
                            addOn: true,
                        },
                    },
                },
            });
            return {
                bookingId: booking.id,
                bookingCode: booking.bookingCode,
                status: booking.status,
                expiresAt: addMinutes(booking.createdAt, PENDING_BOOKING_WINDOW_MINUTES).toISOString(),
                summary: {
                    customerName: booking.customerName,
                    customerPhone: booking.customerPhone,
                    location: booking.location.name,
                    package: booking.package.name,
                    studio: booking.schedule.studio.name,
                    studioType: booking.schedule.studio.type,
                    scheduleDate: booking.schedule.date.toISOString(),
                    startTime: booking.schedule.startTime.toISOString(),
                    endTime: booking.schedule.endTime.toISOString(),
                    participantCount: booking.participantCount,
                    addOns: booking.addOns.map(item => ({
                        name: item.addOn.name,
                        quantity: item.quantity,
                        subtotal: formatMoney(item.quantity * item.addOn.price),
                    })),
                    totalPrice: booking.totalPrice,
                },
            };
        });
    },
    async getSummary(userId, bookingId) {
        await syncBookingPayments();
        const booking = await getBookingOwnedByUser(userId, bookingId);
        return toSummaryResponse(booking);
    },
    async getAdminBookings(params) {
        await syncBookingPayments();
        const where = {};
        const scheduleFilter = {};
        if (params.bookingCode) {
            where.bookingCode = {
                contains: params.bookingCode.trim(),
                mode: "insensitive",
            };
        }
        if (params.customerName) {
            where.customerName = {
                contains: params.customerName.trim(),
                mode: "insensitive",
            };
        }
        if (params.status) {
            where.status = params.status;
        }
        if (params.paymentStatus) {
            where.payment = {
                is: {
                    status: params.paymentStatus,
                },
            };
        }
        if (params.locationId) {
            where.locationId = params.locationId.trim();
        }
        if (params.studioType) {
            if (!isStudioType(params.studioType.trim())) {
                throw new Error("Jenis studio tidak valid");
            }
            scheduleFilter.studio = {
                type: params.studioType.trim(),
            };
        }
        if (params.dateFrom || params.dateTo) {
            scheduleFilter.startTime = {
                ...(params.dateFrom ? { gte: parseDateTime(params.dateFrom, "dateFrom") } : {}),
                ...(params.dateTo ? { lte: parseDateTime(params.dateTo, "dateTo") } : {}),
            };
        }
        if (Object.keys(scheduleFilter).length > 0) {
            where.schedule = {
                is: scheduleFilter,
            };
        }
        const bookings = await prisma.booking.findMany({
            where,
            include: {
                user: true,
                creator: true,
                location: true,
                package: true,
                schedule: {
                    include: {
                        studio: true,
                    },
                },
                payment: true,
                auditLogs: {
                    include: {
                        user: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                },
            },
            orderBy: [{ schedule: { startTime: "asc" } }, { createdAt: "desc" }],
        });
        const items = bookings.map(mapAdminBookingListItem);
        const summary = items.reduce((acc, item) => {
            acc.totalBookings += 1;
            acc.totalOrderValue = formatMoney(acc.totalOrderValue + item.payment.totalPrice);
            acc.totalPaidAmount = formatMoney(acc.totalPaidAmount + item.payment.paidAmount);
            if (item.status === "pending")
                acc.pendingBookings += 1;
            if (item.status === "confirmed")
                acc.confirmedBookings += 1;
            if (item.status === "completed")
                acc.completedBookings += 1;
            if (item.status === "cancelled")
                acc.cancelledBookings += 1;
            if (item.issueFlags.length > 0)
                acc.problematicBookings += 1;
            return acc;
        }, {
            totalBookings: 0,
            totalOrderValue: 0,
            totalPaidAmount: 0,
            pendingBookings: 0,
            confirmedBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            problematicBookings: 0,
        });
        return {
            filters: params,
            summary,
            items,
        };
    },
    async getAdminBookingDetail(bookingId) {
        await syncBookingPayments();
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                user: true,
                creator: true,
                location: true,
                package: true,
                schedule: {
                    include: {
                        studio: true,
                    },
                },
                addOns: {
                    include: {
                        addOn: true,
                    },
                },
                payment: true,
                ticket: true,
                auditLogs: {
                    include: {
                        user: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });
        if (!booking) {
            throw new Error("Booking tidak ditemukan");
        }
        const addOnTotal = calculateAddOnTotal(booking.addOns);
        return {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            source: getBookingSource(),
            status: booking.status,
            issueFlags: buildIssueFlags(booking),
            customer: {
                name: booking.customerName,
                phone: booking.customerPhone,
                user: booking.user
                    ? {
                        id: booking.user.id,
                        name: booking.user.name,
                        email: booking.user.email,
                        role: booking.user.role,
                    }
                    : null,
            },
            handledBy: booking.creator
                ? {
                    id: booking.creator.id,
                    name: booking.creator.name,
                    email: booking.creator.email,
                }
                : null,
            bookingContext: {
                location: {
                    id: booking.location.id,
                    name: booking.location.name,
                },
                package: {
                    id: booking.package.id,
                    name: booking.package.name,
                    durationMinutes: booking.package.durationMinutes,
                    maxCapacity: booking.package.maxCapacity,
                    price: booking.package.price,
                },
                schedule: {
                    id: booking.schedule.id,
                    date: booking.schedule.date.toISOString(),
                    startTime: booking.schedule.startTime.toISOString(),
                    endTime: booking.schedule.endTime.toISOString(),
                },
                studio: {
                    id: booking.schedule.studio.id,
                    name: booking.schedule.studio.name,
                    type: booking.schedule.studio.type,
                    capacity: booking.schedule.studio.capacity,
                },
                participantCount: booking.participantCount,
                addOns: booking.addOns.map(item => ({
                    id: item.addOn.id,
                    name: item.addOn.name,
                    quantity: item.quantity,
                    unitPrice: item.addOn.price,
                    subtotal: formatMoney(item.quantity * item.addOn.price),
                })),
            },
            financialContext: {
                packagePrice: booking.package.price,
                addOnTotal: formatMoney(addOnTotal),
                totalOrderValue: booking.totalPrice,
                payment: booking.payment
                    ? {
                        id: booking.payment.id,
                        status: booking.payment.status,
                        method: booking.payment.method,
                        amount: booking.payment.amount,
                        gatewayReference: booking.payment.gatewayReference,
                        paidAt: booking.payment.paidAt?.toISOString() ?? null,
                        expiredAt: booking.payment.expiredAt?.toISOString() ?? null,
                    }
                    : null,
            },
            ticket: booking.ticket
                ? {
                    id: booking.ticket.id,
                    qrCode: booking.ticket.qrCode,
                    status: booking.ticket.status,
                    issuedAt: booking.ticket.issuedAt.toISOString(),
                    expiredAt: booking.ticket.expiredAt.toISOString(),
                }
                : null,
            auditTrail: booking.auditLogs.map(log => ({
                id: log.id,
                action: log.action,
                actor: log.user
                    ? {
                        id: log.user.id,
                        name: log.user.name,
                        email: log.user.email,
                        role: log.user.role,
                    }
                    : null,
                oldData: log.oldData,
                newData: log.newData,
                createdAt: log.createdAt.toISOString(),
            })),
            createdAt: booking.createdAt.toISOString(),
            updatedAt: booking.updatedAt.toISOString(),
        };
    },
    async getAdminAuditLogs(params) {
        const where = {
            entityType: "booking",
        };
        if (params.bookingId) {
            where.bookingId = params.bookingId.trim();
        }
        if (params.action) {
            where.action = {
                contains: params.action.trim(),
                mode: "insensitive",
            };
        }
        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: true,
                booking: {
                    include: {
                        payment: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return {
            total: logs.length,
            items: logs.map(log => ({
                id: log.id,
                action: log.action,
                bookingId: log.bookingId,
                bookingCode: log.booking?.bookingCode ?? null,
                bookingStatus: log.booking?.status ?? null,
                paymentStatus: log.booking?.payment?.status ?? null,
                paymentAmount: log.booking?.payment?.amount ?? null,
                actor: log.user
                    ? {
                        id: log.user.id,
                        name: log.user.name,
                        email: log.user.email,
                        role: log.user.role,
                    }
                    : null,
                oldData: log.oldData,
                newData: log.newData,
                createdAt: log.createdAt.toISOString(),
            })),
        };
    },
    async getAdminRevenueReport(params) {
        await syncBookingPayments();
        const groupBy = params.groupBy && isRevenueGroupBy(params.groupBy) ? params.groupBy : "daily";
        const dateFrom = params.dateFrom ? parseDateOnly(params.dateFrom) : startOfUtcDay(new Date());
        const dateTo = params.dateTo ? parseDateOnly(params.dateTo) : dateFrom;
        if (dateFrom > dateTo) {
            throw new Error("dateFrom tidak boleh lebih besar dari dateTo");
        }
        const paidWhere = {
            status: "paid",
            paidAt: {
                gte: startOfUtcDay(dateFrom),
                lte: endOfUtcDay(dateTo),
            },
        };
        if (params.locationId) {
            paidWhere.booking = {
                locationId: params.locationId.trim(),
            };
        }
        const paidPayments = await prisma.payment.findMany({
            where: paidWhere,
            include: {
                booking: {
                    include: {
                        location: true,
                        package: true,
                    },
                },
            },
            orderBy: {
                paidAt: "asc",
            },
        });
        const cancelledPaidWhere = {
            status: "cancelled",
            payment: {
                is: {
                    status: "paid",
                    paidAt: {
                        gte: startOfUtcDay(dateFrom),
                        lte: endOfUtcDay(dateTo),
                    },
                },
            },
        };
        if (params.locationId) {
            cancelledPaidWhere.locationId = params.locationId.trim();
        }
        const cancelledPaidBookings = await prisma.booking.findMany({
            where: cancelledPaidWhere,
            include: {
                payment: true,
            },
        });
        const periods = [];
        for (let cursor = startOfUtcDay(dateFrom); cursor <= endOfUtcDay(dateTo);) {
            const { periodStart, periodEnd, nextCursor, label } = buildRevenuePeriodBounds(groupBy, cursor);
            if (periodStart > endOfUtcDay(dateTo)) {
                break;
            }
            const inPeriodPayments = paidPayments.filter(payment => {
                if (!payment.paidAt)
                    return false;
                return payment.paidAt >= periodStart && payment.paidAt <= periodEnd;
            });
            const inPeriodCancelledPaid = cancelledPaidBookings.filter(booking => {
                const paidAt = booking.payment?.paidAt;
                if (!paidAt)
                    return false;
                return paidAt >= periodStart && paidAt <= periodEnd;
            });
            const grossRevenue = formatMoney(inPeriodPayments.reduce((sum, payment) => sum + payment.amount, 0));
            const cancelledPaidAmount = formatMoney(inPeriodCancelledPaid.reduce((sum, booking) => sum + (booking.payment?.amount ?? 0), 0));
            periods.push({
                label,
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                paidTransactions: inPeriodPayments.length,
                grossRevenue,
                cancelledPaidBookings: inPeriodCancelledPaid.length,
                cancelledPaidAmount,
                activeRevenueEstimate: formatMoney(grossRevenue - cancelledPaidAmount),
            });
            if (nextCursor > endOfUtcDay(dateTo)) {
                break;
            }
            cursor = nextCursor;
        }
        const grossRevenue = formatMoney(paidPayments.reduce((sum, payment) => sum + payment.amount, 0));
        const cancelledPaidAmount = formatMoney(cancelledPaidBookings.reduce((sum, booking) => sum + (booking.payment?.amount ?? 0), 0));
        const revenueByLocation = new Map();
        for (const payment of paidPayments) {
            const locationId = payment.booking.locationId;
            const current = revenueByLocation.get(locationId) ?? {
                locationId,
                locationName: payment.booking.location.name,
                grossRevenue: 0,
                paidTransactions: 0,
            };
            current.grossRevenue = formatMoney(current.grossRevenue + payment.amount);
            current.paidTransactions += 1;
            revenueByLocation.set(locationId, current);
        }
        return {
            filters: {
                groupBy,
                dateFrom: startOfUtcDay(dateFrom).toISOString(),
                dateTo: endOfUtcDay(dateTo).toISOString(),
                locationId: params.locationId ?? null,
                timezone: "UTC",
            },
            summary: {
                paidTransactions: paidPayments.length,
                grossRevenue,
                cancelledPaidBookings: cancelledPaidBookings.length,
                cancelledPaidAmount,
                activeRevenueEstimate: formatMoney(grossRevenue - cancelledPaidAmount),
            },
            periods,
            revenueByLocation: Array.from(revenueByLocation.values()).sort((a, b) => a.locationName.localeCompare(b.locationName)),
        };
    },
    async rescheduleAdminBooking(adminUserId, bookingId, payload) {
        await syncBookingPayments();
        const scheduleId = String(payload.scheduleId ?? "").trim();
        const reason = String(payload.reason ?? "").trim();
        if (!scheduleId) {
            throw new Error("scheduleId wajib diisi");
        }
        return prisma.$transaction(async (tx) => {
            const [adminUser, booking, nextSchedule] = await Promise.all([
                tx.user.findUnique({
                    where: { id: adminUserId },
                }),
                tx.booking.findUnique({
                    where: { id: bookingId },
                    include: {
                        package: true,
                        schedule: {
                            include: {
                                studio: true,
                            },
                        },
                        payment: true,
                        ticket: true,
                    },
                }),
                tx.schedule.findUnique({
                    where: { id: scheduleId },
                    include: {
                        studio: true,
                        booking: true,
                    },
                }),
            ]);
            if (!adminUser)
                throw new Error("Admin tidak ditemukan");
            if (!booking)
                throw new Error("Booking tidak ditemukan");
            if (!nextSchedule)
                throw new Error("Jadwal baru tidak ditemukan");
            if (["cancelled", "completed", "expired"].includes(booking.status)) {
                throw new Error("Booking ini tidak bisa di-reschedule");
            }
            const slotDurationMinutes = (nextSchedule.endTime.getTime() - nextSchedule.startTime.getTime()) / (60 * 1000);
            if (slotDurationMinutes < booking.package.durationMinutes) {
                throw new Error("Durasi slot baru tidak cukup untuk paket yang dipilih");
            }
            if (nextSchedule.startTime <= new Date()) {
                throw new Error("Jadwal baru sudah lewat");
            }
            if (nextSchedule.booking &&
                nextSchedule.booking.id !== booking.id &&
                ACTIVE_BOOKING_STATUSES.includes(nextSchedule.booking.status)) {
                throw new Error("Jadwal baru sudah terisi");
            }
            const updatedBooking = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    scheduleId: nextSchedule.id,
                    locationId: nextSchedule.studio.locationId,
                },
                include: {
                    schedule: {
                        include: {
                            studio: true,
                        },
                    },
                },
            });
            if (booking.ticket) {
                await tx.ticket.update({
                    where: { bookingId: booking.id },
                    data: {
                        expiredAt: nextSchedule.endTime,
                        status: booking.payment?.status === "paid" ? "active" : booking.ticket.status,
                    },
                });
            }
            await createAuditLog(tx, {
                userId: adminUser.id,
                action: "booking_rescheduled",
                bookingId: booking.id,
                oldData: {
                    scheduleId: booking.schedule.id,
                    studioName: booking.schedule.studio.name,
                    startTime: booking.schedule.startTime.toISOString(),
                    endTime: booking.schedule.endTime.toISOString(),
                },
                newData: {
                    scheduleId: updatedBooking.schedule.id,
                    studioName: updatedBooking.schedule.studio.name,
                    startTime: updatedBooking.schedule.startTime.toISOString(),
                    endTime: updatedBooking.schedule.endTime.toISOString(),
                    reason: reason || null,
                },
            });
            return {
                bookingId: booking.id,
                bookingCode: booking.bookingCode,
                status: updatedBooking.status,
                newSchedule: {
                    id: updatedBooking.schedule.id,
                    studioName: updatedBooking.schedule.studio.name,
                    studioType: updatedBooking.schedule.studio.type,
                    startTime: updatedBooking.schedule.startTime.toISOString(),
                    endTime: updatedBooking.schedule.endTime.toISOString(),
                },
            };
        });
    },
    async cancelAdminBooking(adminUserId, bookingId, payload) {
        await syncBookingPayments();
        const reason = String(payload.reason ?? "").trim();
        if (!reason || reason.length < 3) {
            throw new Error("Alasan pembatalan minimal 3 karakter");
        }
        return prisma.$transaction(async (tx) => {
            const [adminUser, booking] = await Promise.all([
                tx.user.findUnique({
                    where: { id: adminUserId },
                }),
                tx.booking.findUnique({
                    where: { id: bookingId },
                    include: {
                        payment: true,
                        ticket: true,
                    },
                }),
            ]);
            if (!adminUser)
                throw new Error("Admin tidak ditemukan");
            if (!booking)
                throw new Error("Booking tidak ditemukan");
            if (["cancelled", "completed", "expired"].includes(booking.status)) {
                throw new Error("Booking ini tidak bisa dibatalkan");
            }
            const updatedBooking = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: "cancelled",
                },
            });
            if (booking.payment?.status === "pending") {
                await tx.payment.update({
                    where: { bookingId: booking.id },
                    data: {
                        status: "failed",
                        expiredAt: new Date(),
                    },
                });
            }
            if (booking.ticket) {
                await tx.ticket.update({
                    where: { bookingId: booking.id },
                    data: {
                        status: "expired",
                        expiredAt: new Date(),
                    },
                });
            }
            await createAuditLog(tx, {
                userId: adminUser.id,
                action: "booking_cancelled_by_admin",
                bookingId: booking.id,
                oldData: {
                    status: booking.status,
                    paymentStatus: booking.payment?.status ?? null,
                },
                newData: {
                    status: updatedBooking.status,
                    reason,
                    refundFollowUpRequired: booking.payment?.status === "paid",
                },
            });
            return {
                bookingId: booking.id,
                bookingCode: booking.bookingCode,
                status: updatedBooking.status,
                reason,
                refundFollowUpRequired: booking.payment?.status === "paid",
            };
        });
    },
    async createPayment(userId, bookingId, method) {
        await syncBookingPayments();
        if (!method || !isPaymentMethod(String(method))) {
            throw new Error("Metode pembayaran tidak valid");
        }
        return prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findFirst({
                where: {
                    id: bookingId,
                    userId,
                },
                include: {
                    payment: true,
                },
            });
            if (!booking)
                throw new Error("Booking tidak ditemukan");
            if (booking.status !== "pending")
                throw new Error("Booking ini tidak bisa dibayar");
            const expiredAt = buildPaymentExpiry();
            const gatewayReference = `PAY-${booking.bookingCode}`;
            const payment = booking.payment
                ? await tx.payment.update({
                    where: { bookingId: booking.id },
                    data: {
                        method: method,
                        amount: booking.totalPrice,
                        status: "pending",
                        gatewayReference,
                        expiredAt,
                        paidAt: null,
                    },
                })
                : await tx.payment.create({
                    data: {
                        bookingId: booking.id,
                        amount: booking.totalPrice,
                        method: method,
                        status: "pending",
                        gatewayReference,
                        expiredAt,
                    },
                });
            return {
                bookingId: booking.id,
                paymentId: payment.id,
                amount: payment.amount,
                method: payment.method,
                status: payment.status,
                expiredAt: payment.expiredAt?.toISOString() ?? null,
                autoSuccessAfterSeconds: isVirtualAccountMethod(payment.method) ? VA_AUTO_SUCCESS_SECONDS : null,
                autoSuccessAt: isVirtualAccountMethod(payment.method)
                    ? new Date(payment.createdAt.getTime() + VA_AUTO_SUCCESS_SECONDS * 1000).toISOString()
                    : null,
                gatewayReference: payment.gatewayReference,
                paymentPageUrl: payment.method === "qris" ? buildQrisPaymentPageUrl(payment.id) : null,
                instructions: getPaymentInstructions(payment.method),
            };
        });
    },
    async confirmPayment(userId, bookingId) {
        await syncBookingPayments();
        return prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findFirst({
                where: {
                    id: bookingId,
                    userId,
                },
                include: {
                    payment: true,
                    schedule: true,
                    ticket: true,
                },
            });
            if (!booking)
                throw new Error("Booking tidak ditemukan");
            if (!booking.payment)
                throw new Error("Payment belum dibuat");
            const paidAt = new Date();
            await finalizePaidBooking(tx, booking.payment.id, paidAt);
            const refreshedBooking = await tx.booking.findUniqueOrThrow({
                where: { id: booking.id },
                include: {
                    ticket: true,
                },
            });
            return {
                bookingId: booking.id,
                bookingCode: refreshedBooking.bookingCode,
                status: refreshedBooking.status,
                paidAt: paidAt.toISOString(),
                ticket: {
                    id: refreshedBooking.ticket.id,
                    qrCode: refreshedBooking.ticket.qrCode,
                    expiredAt: refreshedBooking.ticket.expiredAt.toISOString(),
                },
            };
        });
    },
    async getTicket(userId, bookingId) {
        await syncBookingPayments();
        const booking = await getBookingOwnedByUser(userId, bookingId);
        if (!booking.ticket) {
            throw new Error("Tiket belum tersedia. Selesaikan pembayaran terlebih dahulu.");
        }
        if (booking.payment?.status !== "paid") {
            throw new Error("Tiket belum tersedia. Selesaikan pembayaran terlebih dahulu.");
        }
        return {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            status: booking.status,
            customer: {
                name: booking.customerName,
                phone: booking.customerPhone,
            },
            package: {
                name: booking.package.name,
                durationMinutes: booking.package.durationMinutes,
            },
            location: booking.location.name,
            schedule: {
                date: booking.schedule.date.toISOString(),
                startTime: booking.schedule.startTime.toISOString(),
                endTime: booking.schedule.endTime.toISOString(),
                studioName: booking.schedule.studio.name,
                studioType: booking.schedule.studio.type,
            },
            ticket: {
                id: booking.ticket.id,
                qrCode: booking.ticket.qrCode,
                status: booking.ticket.status,
                issuedAt: booking.ticket.issuedAt.toISOString(),
                expiredAt: booking.ticket.expiredAt.toISOString(),
            },
        };
    },
    async getQrisPaymentPage(paymentId) {
        return getQrisPaymentPage(paymentId);
    },
    async confirmQrisPaymentFromPage(paymentId) {
        return confirmQrisPaymentFromPage(paymentId);
    },
};
//# sourceMappingURL=booking.service.js.map