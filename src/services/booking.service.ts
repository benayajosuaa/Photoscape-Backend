import type { BookingStatus, PaymentMethod, Prisma, StudioType } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed"];
import {
  PENDING_BOOKING_WINDOW_MINUTES,
  PAYMENT_METHODS,
  VA_AUTO_SUCCESS_SECONDS,
  buildPaymentExpiry,
  buildQrisPaymentPageUrl,
  confirmQrisPaymentFromPage,
  finalizePaidBooking,
  getPaymentInstructions,
  getQrisPaymentPage,
  isPaymentMethod,
  isVirtualAccountMethod,
  syncBookingPayments,
} from "./payment.services.js";
import { NotificationServices } from "./notification.service.js";

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

type CreatedBookingResponse = Prisma.BookingGetPayload<{
  include: {
    location: true;
    package: true;
    schedule: {
      include: {
        studio: true;
      };
    };
    addOns: {
      include: {
        addOn: true;
      };
    };
  };
}>;

type AvailabilitySchedule = Prisma.ScheduleGetPayload<{
  include: {
    studio: true;
    booking: {
      include: {
        payment: true;
      };
    };
  };
}>;

function isStudioType(value: string): value is StudioType {
  return ["K1", "K2", "PHOTO_BOX", "SELF_PHOTO"].includes(value);
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

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatMoney(value: number) {
  return Number(value.toFixed(2));
}

function mapScheduleToSlot(schedule: AvailabilitySchedule, packageDurationMinutes: number, now: Date) {
  const booking = schedule.booking;
  const isPast = schedule.startTime <= now;
  const hasLongEnoughDuration =
    schedule.endTime.getTime() - schedule.startTime.getTime() >= packageDurationMinutes * 60 * 1000;

  const bookingBlocksSlot = Boolean(
    booking &&
      ACTIVE_BOOKING_STATUSES.includes(booking.status) &&
      (booking.status !== "pending" || addMinutes(booking.createdAt, PENDING_BOOKING_WINDOW_MINUTES) > now)
  );

  let status: "available" | "unavailable" = "available";
  let reason: string | null = null;

  if (isPast) {
    status = "unavailable";
    reason = "Jadwal sudah lewat";
  } else if (!hasLongEnoughDuration) {
    status = "unavailable";
    reason = "Durasi slot tidak cukup untuk paket ini";
  } else if (bookingBlocksSlot) {
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
}

function buildBookingCode() {
  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `PS-${year}${month}${day}-${random}`;
}

function ensurePositiveQuantity(quantity: number | undefined) {
  const normalized = quantity ?? 1;

  if (!Number.isInteger(normalized) || normalized < 1) {
    throw new Error("Quantity add-on tidak valid");
  }

  return normalized;
}

async function getBookingOwnedByUser(userId: string, bookingId: string) {
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

function calculateAddOnTotal(addOns: Array<{ quantity: number; addOn: { price: number } }>) {
  return addOns.reduce((total, item) => total + item.addOn.price * item.quantity, 0);
}

function toSummaryResponse(booking: Awaited<ReturnType<typeof getBookingOwnedByUser>>) {
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
  async getMeta(params: BookingMetaParams) {
    await syncBookingPayments();

    const wherePackage: Prisma.PhotoPackageWhereInput = {};
    const whereStudio: Prisma.StudioWhereInput = {
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

  async getAvailability(params: AvailabilityParams) {
    await syncBookingPayments();

    if (!params.locationId) throw new Error("locationId wajib diisi");

    if (params.studioType && !isStudioType(params.studioType)) {
      throw new Error("Jenis studio tidak valid");
    }

    const date = params.date ? parseDateOnly(params.date) : startOfDay(new Date());
    const studioWhere: Prisma.StudioWhereInput = {
      isActive: true,
      locationId: params.locationId,
      ...(params.studioType ? { type: params.studioType as StudioType } : {}),
    };

    const scheduleWhere: Prisma.ScheduleWhereInput = {
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      studio: studioWhere,
    };

    const [packages, location, studios] = await Promise.all([
      params.packageId
        ? prisma.photoPackage.findMany({
            where: { id: params.packageId },
            orderBy: [{ durationMinutes: "asc" }, { price: "asc" }],
          })
        : prisma.photoPackage.findMany({
            orderBy: [{ durationMinutes: "asc" }, { price: "asc" }],
          }),
      prisma.location.findUnique({
        where: { id: params.locationId },
      }),
      prisma.studio.findMany({
        where: studioWhere,
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
    ]);

    if (!location) throw new Error("Lokasi tidak ditemukan");
    if (packages.length === 0) throw new Error("Paket tidak ditemukan");

    const schedules: AvailabilitySchedule[] = await prisma.schedule.findMany({
      where: scheduleWhere,
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
    const packageAvailabilities = packages.map(photoPackage => {
      const slots = schedules.map(schedule => mapScheduleToSlot(schedule, photoPackage.durationMinutes, now));

      return {
        package: {
          id: photoPackage.id,
          name: photoPackage.name,
          durationMinutes: photoPackage.durationMinutes,
          price: photoPackage.price,
          maxCapacity: photoPackage.maxCapacity,
        },
        slots,
        availableSlots: slots.filter(slot => slot.status === "available"),
      };
    });

    if (params.packageId) {
      const [selectedPackageAvailability] = packageAvailabilities;

      if (!selectedPackageAvailability) {
        throw new Error("Paket tidak ditemukan");
      }

      return {
        location,
        date: startOfDay(date).toISOString(),
        package: selectedPackageAvailability.package,
        studioType: params.studioType ?? null,
        studios,
        slots: selectedPackageAvailability.slots,
        availableSlots: selectedPackageAvailability.availableSlots,
      };
    }

    return {
      location,
      date: startOfDay(date).toISOString(),
      studioType: params.studioType ?? null,
      studios,
      packages: packageAvailabilities,
    };
  },

  async createBooking(userId: string, payload: CreateBookingPayload) {
    await syncBookingPayments();

    const customerName = String(payload.customerName ?? "").trim();
    const customerPhone = String(payload.customerPhone ?? "").trim();
    const locationId = String(payload.locationId ?? "").trim();
    const packageId = String(payload.packageId ?? "").trim();
    const studioType = String(payload.studioType ?? "").trim();
    const scheduleId = String(payload.scheduleId ?? "").trim();
    const participantCount = Number(payload.participantCount ?? 1);
    const addOnsPayload = Array.isArray(payload.addOns) ? payload.addOns : [];

    if (!customerName || customerName.length < 2) throw new Error("Nama customer minimal 2 karakter");
    if (!customerPhone || customerPhone.length < 8) throw new Error("Nomor HP tidak valid");
    if (!locationId) throw new Error("locationId wajib diisi");
    if (!packageId) throw new Error("packageId wajib diisi");
    if (!scheduleId) throw new Error("scheduleId wajib diisi");
    if (!isStudioType(studioType)) throw new Error("Jenis studio tidak valid");
    if (!Number.isInteger(participantCount) || participantCount < 1) throw new Error("participantCount tidak valid");

    const result = await prisma.$transaction(async tx => {
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

      if (!user) throw new Error("User tidak ditemukan");
      if (!photoPackage) throw new Error("Paket tidak ditemukan");
      if (!schedule) throw new Error("Jadwal tidak ditemukan");
      if (schedule.studio.locationId !== locationId) throw new Error("Jadwal tidak sesuai dengan lokasi yang dipilih");
      if (schedule.studio.type !== studioType) throw new Error("Jadwal tidak sesuai dengan jenis studio yang dipilih");
      if (!schedule.studio.isActive) throw new Error("Studio sedang tidak aktif");
      if (schedule.startTime <= new Date()) throw new Error("Jadwal yang dipilih sudah lewat");
      if (participantCount > photoPackage.maxCapacity) throw new Error("Jumlah peserta melebihi kapasitas paket");

      const slotDurationMinutes = (schedule.endTime.getTime() - schedule.startTime.getTime()) / (60 * 1000);
      if (slotDurationMinutes < photoPackage.durationMinutes) {
        throw new Error("Durasi slot tidak cukup untuk paket yang dipilih");
      }

      if (
        schedule.booking &&
        ACTIVE_BOOKING_STATUSES.includes(schedule.booking.status) &&
        (schedule.booking.status !== "pending" ||
          addMinutes(schedule.booking.createdAt, PENDING_BOOKING_WINDOW_MINUTES) > new Date())
      ) {
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

      const createData: Prisma.BookingUncheckedCreateInput = {
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

      const booking: CreatedBookingResponse = await tx.booking.create({
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

    await NotificationServices.notifyBookingCreated(result.bookingId);

    return result;
  },

  async getSummary(userId: string, bookingId: string) {
    await syncBookingPayments();
    const booking = await getBookingOwnedByUser(userId, bookingId);
    return toSummaryResponse(booking);
  },

  async createPayment(userId: string, bookingId: string, method: string) {
    await syncBookingPayments();

    if (!method || !isPaymentMethod(String(method))) {
      throw new Error("Metode pembayaran tidak valid");
    }

    const result = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          userId,
        },
        include: {
          payment: true,
        },
      });

      if (!booking) throw new Error("Booking tidak ditemukan");
      if (booking.status !== "pending") throw new Error("Booking ini tidak bisa dibayar");

      const expiredAt = buildPaymentExpiry();
      const gatewayReference = `PAY-${booking.bookingCode}`;

      const payment = booking.payment
        ? await tx.payment.update({
            where: { bookingId: booking.id },
            data: {
              method: method as PaymentMethod,
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
              method: method as PaymentMethod,
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

    await NotificationServices.notifyPaymentPending(result.bookingId);

    return result;
  },

  async confirmPayment(userId: string, bookingId: string) {
    await syncBookingPayments();

    const result = await prisma.$transaction(async tx => {
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

      if (!booking) throw new Error("Booking tidak ditemukan");
      if (!booking.payment) throw new Error("Payment belum dibuat");

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
          id: refreshedBooking.ticket!.id,
          qrCode: refreshedBooking.ticket!.qrCode,
          expiredAt: refreshedBooking.ticket!.expiredAt.toISOString(),
        },
      };
    });

    await NotificationServices.notifyPaymentPaid(result.bookingId);

    return result;
  },

  async cancelBooking(userId: string, bookingId: string, payload: CancelBookingPayload) {
    const reason = String(payload.reason ?? "").trim() || "Dibatalkan oleh pengguna";

    const result = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          userId,
        },
        include: {
          payment: true,
          ticket: true,
          user: true,
        },
      });

      if (!booking) throw new Error("Booking tidak ditemukan");
      if (booking.status === "cancelled") throw new Error("Booking sudah dibatalkan");
      if (booking.status === "completed") throw new Error("Booking yang sudah selesai tidak bisa dibatalkan");

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
            expiredAt: new Date(),
            status: "failed",
          },
        });
      }

      if (booking.ticket) {
        await tx.ticket.update({
          where: { bookingId: booking.id },
          data: {
            expiredAt: new Date(),
            status: "expired",
          },
        });
      }

      return {
        bookingId: booking.id,
        hadPendingPayment: Boolean(booking.payment && booking.payment.status === "pending"),
        reason,
        userName: booking.user?.name ?? booking.customerName,
      };
    });

    await NotificationServices.notifyBookingCancelled({
      actorName: result.userName,
      bookingId: result.bookingId,
      cancelledBy: "customer",
      reason: result.reason,
    });
    if (result.hadPendingPayment) {
      await NotificationServices.notifyPaymentFailed(
        result.bookingId,
        "Pembayaran dibatalkan karena booking dibatalkan oleh pengguna."
      );
    }

    return {
      bookingId: result.bookingId,
      reason: result.reason,
      status: "cancelled",
    };
  },

  async getTicket(userId: string, bookingId: string) {
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

  async getQrisPaymentPage(paymentId: string) {
    return getQrisPaymentPage(paymentId);
  },

  async confirmQrisPaymentFromPage(paymentId: string) {
    return confirmQrisPaymentFromPage(paymentId);
  },
};
