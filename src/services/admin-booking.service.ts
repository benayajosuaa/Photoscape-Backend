import { Prisma } from "@prisma/client";
import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { buildPaymentExpiry } from "./payment.services.js";

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed"];
const ADMIN_EDITABLE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed"];

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

const bookingAdminInclude = {
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
  addOns: {
    include: {
      addOn: true,
    },
  },
  ticket: true,
} satisfies Prisma.BookingInclude;

type AdminBookingRecord = Prisma.BookingGetPayload<{
  include: typeof bookingAdminInclude;
}>;

function isBookingStatus(value: string): value is BookingStatus {
  return ["pending", "confirmed", "completed", "cancelled", "expired"].includes(value);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid");
  }

  return date;
}

function formatMoney(value: number) {
  return Number(value.toFixed(2));
}

function ensurePositiveQuantity(quantity: number | undefined) {
  const normalized = quantity ?? 1;

  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new Error("Quantity add-on tidak valid");
  }

  return normalized;
}

function buildBookingCode() {
  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `PS-${year}${month}${day}-${random}`;
}

function normalizeJson<T>(data: T) {
  return JSON.parse(JSON.stringify(data)) as T;
}

function getManagementStatusLabel(bookingStatus: BookingStatus, paymentStatus: PaymentStatus | null) {
  if (bookingStatus === "cancelled") return "Cancelled";
  if (bookingStatus === "expired") return "Expired";
  if (bookingStatus === "completed") return "Completed";
  if (bookingStatus === "confirmed" && paymentStatus === "paid") return "Confirmed / Paid";
  if (bookingStatus === "confirmed") return "Confirmed";
  if (bookingStatus === "pending" && paymentStatus === "pending") return "Pending Payment";
  if (bookingStatus === "pending" && paymentStatus === "failed") return "Pending / Payment Failed";
  if (bookingStatus === "pending") return "Pending";
  return bookingStatus;
}

function serializeBookingForAdmin(booking: AdminBookingRecord) {
  const addOnTotal = booking.addOns.reduce((total, item) => total + item.addOn.price * item.quantity, 0);

  return {
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    source: booking.userId ? "registered_user" : "walk_in",
    status: {
      booking: booking.status,
      payment: booking.payment?.status ?? null,
      label: getManagementStatusLabel(booking.status, booking.payment?.status ?? null),
    },
    customer: {
      name: booking.customerName,
      phone: booking.customerPhone,
      type: booking.userId ? "registered_user" : "walk_in",
      user: booking.user
        ? {
            id: booking.user.id,
            name: booking.user.name,
            email: booking.user.email,
            role: booking.user.role,
          }
        : null,
    },
    adminInputBy: booking.creator
      ? {
          id: booking.creator.id,
          name: booking.creator.name,
          email: booking.creator.email,
          role: booking.creator.role,
        }
      : null,
    location: {
      id: booking.location.id,
      name: booking.location.name,
    },
    package: {
      id: booking.package.id,
      name: booking.package.name,
      price: booking.package.price,
      durationMinutes: booking.package.durationMinutes,
      maxCapacity: booking.package.maxCapacity,
    },
    studio: {
      id: booking.schedule.studio.id,
      name: booking.schedule.studio.name,
      type: booking.schedule.studio.type,
      capacity: booking.schedule.studio.capacity,
    },
    schedule: {
      id: booking.schedule.id,
      date: booking.schedule.date.toISOString(),
      startTime: booking.schedule.startTime.toISOString(),
      endTime: booking.schedule.endTime.toISOString(),
    },
    participantCount: booking.participantCount,
    pricing: {
      packagePrice: booking.package.price,
      addOnTotal: formatMoney(addOnTotal),
      totalPrice: booking.totalPrice,
    },
    addOns: booking.addOns.map(item => ({
      id: item.addOn.id,
      name: item.addOn.name,
      quantity: item.quantity,
      unitPrice: item.addOn.price,
      subtotal: formatMoney(item.addOn.price * item.quantity),
    })),
    payment: booking.payment
      ? {
          id: booking.payment.id,
          method: booking.payment.method,
          status: booking.payment.status,
          amount: booking.payment.amount,
          gatewayReference: booking.payment.gatewayReference,
          paidAt: booking.payment.paidAt?.toISOString() ?? null,
          expiredAt: booking.payment.expiredAt?.toISOString() ?? null,
          createdAt: booking.payment.createdAt.toISOString(),
        }
      : null,
    ticket: booking.ticket
      ? {
          id: booking.ticket.id,
          qrCode: booking.ticket.qrCode,
          status: booking.ticket.status,
          issuedAt: booking.ticket.issuedAt.toISOString(),
          expiredAt: booking.ticket.expiredAt.toISOString(),
          scannedAt: booking.ticket.scannedAt?.toISOString() ?? null,
        }
      : null,
  };
}

async function createAuditLog(
  tx: Prisma.TransactionClient,
  params: {
    adminId: string;
    action: string;
    bookingId: string;
    oldData?: unknown;
    newData?: unknown;
  }
) {
  await tx.auditLog.create({
    data: {
      userId: params.adminId,
      action: params.action,
      entityType: "booking",
      entityId: params.bookingId,
      bookingId: params.bookingId,
      oldData: params.oldData === undefined ? Prisma.JsonNull : (normalizeJson(params.oldData) as Prisma.InputJsonValue),
      newData: params.newData === undefined ? Prisma.JsonNull : (normalizeJson(params.newData) as Prisma.InputJsonValue),
    },
  });
}

function ensureAdminEditableStatus(status: BookingStatus) {
  if (!ADMIN_EDITABLE_BOOKING_STATUSES.includes(status)) {
    throw new Error("Booking dengan status ini tidak bisa diubah oleh admin");
  }
}

function isOwner(actor: AdminActor) {
  return actor.role === "owner";
}

function getActorLocationId(actor: AdminActor) {
  if (isOwner(actor)) {
    return null;
  }

  if (!actor.locationId) {
    throw new Error("Admin cabang tidak memiliki lokasi yang terdaftar");
  }

  return actor.locationId;
}

function ensureActorCanAccessBooking(actor: AdminActor, bookingLocationId: string) {
  if (isOwner(actor)) {
    return;
  }

  const actorLocationId = getActorLocationId(actor);

  if (actorLocationId !== bookingLocationId) {
    throw new Error("Anda tidak memiliki akses ke booking cabang ini");
  }
}

function ensureActorCanAccessLocation(actor: AdminActor, locationId: string) {
  if (isOwner(actor)) {
    return;
  }

  const actorLocationId = getActorLocationId(actor);

  if (actorLocationId !== locationId) {
    throw new Error("Anda tidak bisa memindahkan booking ke cabang lain");
  }
}

function ensureSlotAvailable(schedule: {
  id: string;
  booking: {
    id: string;
    createdAt: Date;
    status: BookingStatus;
  } | null;
}, currentBookingId?: string) {
  if (!schedule.booking) {
    return;
  }

  if (schedule.booking.id === currentBookingId) {
    return;
  }

  const blocksSlot =
    ACTIVE_BOOKING_STATUSES.includes(schedule.booking.status) &&
    (schedule.booking.status !== "pending" ||
      addMinutes(schedule.booking.createdAt, 15) > new Date());

  if (blocksSlot) {
    throw new Error("Slot sudah dipakai booking lain");
  }
}

async function resolveAddOns(
  tx: Prisma.TransactionClient,
  addOnsPayload: BookingAddOnInput[] | undefined
) {
  const normalizedPayload = Array.isArray(addOnsPayload) ? addOnsPayload : [];
  const addOnIds = normalizedPayload.map(item => item.addOnId);

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

  return normalizedPayload.map(item => {
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
}

async function loadBookingOrThrow(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: bookingAdminInclude,
  });

  if (!booking) {
    throw new Error("Booking tidak ditemukan");
  }

  return booking;
}

async function refreshBookingForAdmin(tx: Prisma.TransactionClient, bookingId: string) {
  return tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: bookingAdminInclude,
  });
}

function buildBookingFilters(params: BookingFilterParams): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (params.status) {
    if (!isBookingStatus(params.status)) {
      throw new Error("Status booking tidak valid");
    }

    where.status = params.status;
  }

  if (params.date) {
    const date = parseDateOnly(params.date);
    where.schedule = {
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    };
  }

  if (params.search) {
    const search = params.search.trim();

    if (search) {
      where.OR = [
        { bookingCode: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }
  }

  return where;
}

export const AdminBookingServices = {
  async getBookings(actor: AdminActor, params: BookingFilterParams) {
    const where = buildBookingFilters(params);
    const actorLocationId = getActorLocationId(actor);

    if (actorLocationId) {
      where.locationId = actorLocationId;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: bookingAdminInclude,
      orderBy: [{ schedule: { date: "desc" } }, { schedule: { startTime: "desc" } }, { createdAt: "desc" }],
    });

    return {
      total: bookings.length,
      filters: {
        date: params.date ?? null,
        search: params.search ?? null,
        status: params.status ?? null,
      },
      bookings: bookings.map(serializeBookingForAdmin),
    };
  },

  async getBookingDetail(actor: AdminActor, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        ...bookingAdminInclude,
        auditLogs: {
          include: {
            user: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking tidak ditemukan");
    }

    ensureActorCanAccessBooking(actor, booking.locationId);

    return {
      booking: serializeBookingForAdmin(booking),
      history: booking.auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt.toISOString(),
        admin: log.user
          ? {
              id: log.user.id,
              name: log.user.name,
              email: log.user.email,
              role: log.user.role,
            }
          : null,
        oldData: log.oldData,
        newData: log.newData,
      })),
    };
  },

  async getBookingLogs(actor: AdminActor, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        locationId: true,
      },
    });

    if (!booking) {
      throw new Error("Booking tidak ditemukan");
    }

    ensureActorCanAccessBooking(actor, booking.locationId);

    const logs = await prisma.auditLog.findMany({
      where: { bookingId },
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      bookingId,
      total: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt.toISOString(),
        admin: log.user
          ? {
              id: log.user.id,
              name: log.user.name,
              email: log.user.email,
              role: log.user.role,
            }
          : null,
        oldData: log.oldData,
        newData: log.newData,
      })),
    };
  },

  async updateBooking(actor: AdminActor, bookingId: string, payload: UpdateBookingPayload) {
    return prisma.$transaction(async tx => {
      const booking = await loadBookingOrThrow(tx, bookingId);
      ensureActorCanAccessBooking(actor, booking.locationId);
      ensureAdminEditableStatus(booking.status);

      const nextCustomerName =
        payload.customerName === undefined ? booking.customerName : String(payload.customerName).trim();
      const nextCustomerPhone =
        payload.customerPhone === undefined ? booking.customerPhone : String(payload.customerPhone).trim();
      const nextParticipantCount =
        payload.participantCount === undefined ? booking.participantCount : Number(payload.participantCount);
      const nextPackageId = payload.packageId === undefined ? booking.packageId : String(payload.packageId).trim();

      if (!nextCustomerName || nextCustomerName.length < 2) throw new Error("Nama customer minimal 2 karakter");
      if (!nextCustomerPhone || nextCustomerPhone.length < 8) throw new Error("Nomor HP tidak valid");
      if (!Number.isInteger(nextParticipantCount) || nextParticipantCount < 1) {
        throw new Error("participantCount tidak valid");
      }
      if (!nextPackageId) throw new Error("packageId wajib diisi");

      const nextPackage = await tx.photoPackage.findUnique({
        where: { id: nextPackageId },
      });

      if (!nextPackage) throw new Error("Paket tidak ditemukan");

      if (
        nextParticipantCount > nextPackage.maxCapacity ||
        nextParticipantCount > booking.schedule.studio.capacity
      ) {
        throw new Error("Jumlah peserta melebihi kapasitas studio atau paket");
      }

      const slotDurationMinutes =
        (booking.schedule.endTime.getTime() - booking.schedule.startTime.getTime()) / (60 * 1000);
      if (slotDurationMinutes < nextPackage.durationMinutes) {
        throw new Error("Durasi jadwal saat ini tidak cukup untuk paket yang dipilih");
      }

      const addOnsWereProvided = payload.addOns !== undefined;
      const normalizedAddOns = addOnsWereProvided
        ? await resolveAddOns(tx, payload.addOns)
        : booking.addOns.map(item => ({
            addOnId: item.addOnId,
            quantity: item.quantity,
            price: item.addOn.price,
          }));

      const nextAddOnTotal = normalizedAddOns.reduce((total, item) => total + item.price * item.quantity, 0);
      const nextTotalPrice = formatMoney(nextPackage.price + nextAddOnTotal);
      const priceChanged = nextTotalPrice !== booking.totalPrice;

      if (priceChanged && booking.payment?.status === "paid") {
        throw new Error("Booking yang sudah dibayar tidak bisa diubah harga paket/add-on-nya");
      }

      const beforeSnapshot = serializeBookingForAdmin(booking);

      const bookingUpdateData: Prisma.BookingUncheckedUpdateInput = {
        customerName: nextCustomerName,
        customerPhone: nextCustomerPhone,
        participantCount: nextParticipantCount,
        packageId: nextPackage.id,
        totalPrice: nextTotalPrice,
      };

      await tx.booking.update({
        where: { id: booking.id },
        data: addOnsWereProvided
          ? {
              ...bookingUpdateData,
              addOns: {
                deleteMany: {},
                create: normalizedAddOns.map(item => ({
                  addOnId: item.addOnId,
                  quantity: item.quantity,
                })),
              },
            }
          : bookingUpdateData,
      });

      if (booking.payment && booking.payment.status !== "paid") {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            amount: nextTotalPrice,
            expiredAt: booking.payment.status === "pending" ? buildPaymentExpiry() : booking.payment.expiredAt,
          },
        });
      }

      const updatedBooking = await refreshBookingForAdmin(tx, booking.id);

      await createAuditLog(tx, {
        adminId: actor.userId,
        action: "booking.updated",
        bookingId: booking.id,
        oldData: beforeSnapshot,
        newData: {
          booking: serializeBookingForAdmin(updatedBooking),
        },
      });

      return serializeBookingForAdmin(updatedBooking);
    });
  },

  async rescheduleBooking(actor: AdminActor, bookingId: string, payload: RescheduleBookingPayload) {
    const nextScheduleId = String(payload.scheduleId ?? "").trim();

    if (!nextScheduleId) {
      throw new Error("scheduleId wajib diisi");
    }

    return prisma.$transaction(async tx => {
      const booking = await loadBookingOrThrow(tx, bookingId);
      ensureActorCanAccessBooking(actor, booking.locationId);
      ensureAdminEditableStatus(booking.status);

      const nextSchedule = await tx.schedule.findUnique({
        where: { id: nextScheduleId },
        include: {
          studio: true,
          booking: true,
        },
      });

      if (!nextSchedule) throw new Error("Jadwal tujuan tidak ditemukan");
      if (!nextSchedule.studio.isActive) throw new Error("Studio tujuan sedang tidak aktif");
      if (nextSchedule.startTime <= new Date()) throw new Error("Jadwal tujuan sudah lewat");
      ensureActorCanAccessLocation(actor, nextSchedule.studio.locationId);
      if (
        booking.participantCount > booking.package.maxCapacity ||
        booking.participantCount > nextSchedule.studio.capacity
      ) {
        throw new Error("Jumlah peserta tidak muat pada studio tujuan");
      }

      const slotDurationMinutes = (nextSchedule.endTime.getTime() - nextSchedule.startTime.getTime()) / (60 * 1000);
      if (slotDurationMinutes < booking.package.durationMinutes) {
        throw new Error("Durasi slot tujuan tidak cukup untuk paket ini");
      }

      ensureSlotAvailable(nextSchedule, booking.id);

      const beforeSnapshot = serializeBookingForAdmin(booking);

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          scheduleId: nextSchedule.id,
          locationId: nextSchedule.studio.locationId,
        },
      });

      if (booking.ticket) {
        await tx.ticket.update({
          where: { bookingId: booking.id },
          data: {
            expiredAt: nextSchedule.endTime,
          },
        });
      }

      const updatedBooking = await refreshBookingForAdmin(tx, booking.id);

      await createAuditLog(tx, {
        adminId: actor.userId,
        action: "booking.rescheduled",
        bookingId: booking.id,
        oldData: beforeSnapshot,
        newData: {
          booking: serializeBookingForAdmin(updatedBooking),
        },
      });

      return serializeBookingForAdmin(updatedBooking);
    });
  },

  async cancelBooking(actor: AdminActor, bookingId: string, payload: CancelBookingPayload) {
    const reason = String(payload.reason ?? "").trim();

    if (!reason) {
      throw new Error("Alasan pembatalan wajib diisi");
    }

    return prisma.$transaction(async tx => {
      const booking = await loadBookingOrThrow(tx, bookingId);
      ensureActorCanAccessBooking(actor, booking.locationId);

      if (booking.status === "cancelled") {
        throw new Error("Booking sudah dibatalkan");
      }

      const beforeSnapshot = serializeBookingForAdmin(booking);

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "cancelled",
        },
      });

      if (booking.payment && booking.payment.status === "pending") {
        await tx.payment.update({
          where: { id: booking.payment.id },
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

      const updatedBooking = await refreshBookingForAdmin(tx, booking.id);

      await createAuditLog(tx, {
        adminId: actor.userId,
        action: "booking.cancelled_by_admin",
        bookingId: booking.id,
        oldData: beforeSnapshot,
        newData: {
          booking: serializeBookingForAdmin(updatedBooking),
          reason,
        },
      });

      return {
        booking: serializeBookingForAdmin(updatedBooking),
        reason,
      };
    });
  },

  async updateBookingStatus(actor: AdminActor, bookingId: string, payload: UpdateBookingStatusPayload) {
    const nextStatus = String(payload.status ?? "").trim();

    if (!isBookingStatus(nextStatus)) {
      throw new Error("Status booking tidak valid");
    }

    if (nextStatus === "cancelled") {
      return this.cancelBooking(actor, bookingId, {
        reason: payload.reason ?? "Dibatalkan oleh admin",
      });
    }

    return prisma.$transaction(async tx => {
      const booking = await loadBookingOrThrow(tx, bookingId);
      ensureActorCanAccessBooking(actor, booking.locationId);
      const beforeSnapshot = serializeBookingForAdmin(booking);

      if (booking.status === nextStatus) {
        throw new Error("Status booking sudah sama");
      }

      if (nextStatus === "confirmed" && booking.payment?.status !== "paid") {
        throw new Error("Booking belum paid. Gunakan manual payment atau selesaikan pembayaran terlebih dahulu.");
      }

      if (nextStatus === "completed" && booking.status !== "confirmed") {
        throw new Error("Booking hanya bisa diselesaikan dari status confirmed");
      }

      if (nextStatus === "pending" && booking.status === "completed") {
        throw new Error("Booking completed tidak bisa dikembalikan ke pending");
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: nextStatus,
        },
      });

      if (nextStatus === "completed" && booking.ticket) {
        await tx.ticket.update({
          where: { bookingId: booking.id },
          data: {
            status: "used",
            scannedAt: new Date(),
            scannedById: actor.userId,
          },
        });
      }

      const updatedBooking = await refreshBookingForAdmin(tx, booking.id);

      await createAuditLog(tx, {
        adminId: actor.userId,
        action: "booking.status_updated",
        bookingId: booking.id,
        oldData: beforeSnapshot,
        newData: {
          booking: serializeBookingForAdmin(updatedBooking),
          reason: payload.reason ?? null,
        },
      });

      return serializeBookingForAdmin(updatedBooking);
    });
  },

};
