import bcrypt from 'bcrypt';
import type { BookingStatus, PaymentMethod, PaymentStatus, Prisma, StudioType, UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { AuditLogServices } from './audit-log.service.js';

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
  userId?: string;
  action?: string;
};

type DateRange = {
  start: Date;
  end: Date;
};

const PAYMENT_METHOD_VALUES: PaymentMethod[] = ['qris', 'bca_va', 'mandiri_va', 'gopay', 'ovo', 'cash'];
const PAYMENT_STATUS_VALUES: PaymentStatus[] = ['pending', 'paid', 'failed', 'expired'];
const BOOKING_STATUS_VALUES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'expired'];
const STUDIO_TYPE_VALUES: StudioType[] = ['K1', 'K2', 'PHOTO_BOX', 'SELF_PHOTO'];

function parsePagination(query: CommonQuery) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10) || 10));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const day = normalized.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setUTCDate(normalized.getUTCDate() + diff);
  return normalized;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Tanggal tidak valid');
  }
  return date;
}

function toNumber(value: number) {
  return Number(value.toFixed(2));
}

function toPercent(value: number, total: number) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

function getLatestScheduleBooking<T extends { createdAt: Date; status: BookingStatus }>(bookings: T[]): T | null {
  return bookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

function normalizeRoleForCreate(role: string): UserRole {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'staff' || normalized === 'cashier') {
    return 'admin';
  }
  if (normalized === 'owner' || normalized === 'manager' || normalized === 'admin' || normalized === 'customer') {
    return normalized;
  }
  return 'admin';
}

function normalizePeriod(period?: string) {
  if (period === 'daily' || period === 'weekly' || period === 'monthly') return period;
  return 'daily';
}

function parseRange(query: CommonQuery, fallback: 'daily' | 'weekly' | 'monthly' = 'monthly'): DateRange {
  const now = new Date();
  const startDate = query.startDate?.trim();
  const endDate = query.endDate?.trim();

  if (startDate || endDate) {
    const start = startDate ? startOfDay(parseDateOnly(startDate)) : startOfMonth(now);
    const end = endDate ? endOfDay(parseDateOnly(endDate)) : endOfDay(now);
    if (end < start) throw new Error('Rentang tanggal tidak valid');
    return { start, end };
  }

  const period = normalizePeriod(query.period || fallback);
  if (period === 'monthly') {
    return { start: startOfMonth(now), end: endOfDay(now) };
  }
  if (period === 'weekly') {
    return { start: startOfWeek(now), end: endOfDay(now) };
  }
  return { start: startOfDay(now), end: endOfDay(now) };
}

function buildPeriodLabel(date: Date, period: 'daily' | 'weekly' | 'monthly') {
  if (period === 'monthly') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  if (period === 'weekly') {
    return startOfWeek(date).toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

async function getUserStatusMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, boolean>();

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'user',
      action: 'user.status.updated',
      entityId: {
        in: userIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const statusMap = new Map<string, boolean>();
  for (const log of logs) {
    if (statusMap.has(log.entityId)) continue;
    const active = (log.newData as { isActive?: boolean } | null)?.isActive;
    statusMap.set(log.entityId, active !== false);
  }

  for (const id of userIds) {
    if (!statusMap.has(id)) statusMap.set(id, true);
  }

  return statusMap;
}

function toCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) return '';
  const first = rows[0];
  if (!first) return '';
  const headers = Object.keys(first);
  const escapeCell = (value: string | number | null) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header] as string | number | null)).join(','));
  }
  return lines.join('\n');
}

export const OwnerAdminServices = {
  async getDashboard(actor: Actor, query: CommonQuery) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthlyStart = startOfMonth(new Date());
    const { start, end } = parseRange(query, 'monthly');

    const [todayBookings, todayPayments, activeStudios, monthlyNewCustomers, recentLogs, bookingsForTrend] = await Promise.all([
      prisma.booking.findMany({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      prisma.payment.findMany({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
      prisma.studio.count({
        where: {
          isActive: true,
        },
      }),
      prisma.user.count({
        where: {
          role: 'customer',
          createdAt: {
            gte: monthlyStart,
            lte: todayEnd,
          },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      prisma.booking.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          schedule: {
            include: {
              studio: true,
            },
          },
          payment: true,
        },
      }),
    ]);

    const paidToday = todayPayments.filter((item) => item.status === 'paid');

    const revenue7DaysMap = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), todayStart.getUTCDate() - i));
      revenue7DaysMap.set(date.toISOString().slice(0, 10), 0);
    }

    const monthlyBookingMap = new Map<string, number>();
    const studioBusyMap = new Map<string, number>();

    for (const booking of bookingsForTrend) {
      const day = booking.createdAt.toISOString().slice(0, 10);
      if (revenue7DaysMap.has(day) && booking.payment?.status === 'paid') {
        revenue7DaysMap.set(day, (revenue7DaysMap.get(day) || 0) + booking.payment.amount);
      }

      const monthLabel = `${booking.createdAt.getUTCFullYear()}-${String(booking.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyBookingMap.set(monthLabel, (monthlyBookingMap.get(monthLabel) || 0) + 1);

      const studioName = booking.schedule.studio.name;
      studioBusyMap.set(studioName, (studioBusyMap.get(studioName) || 0) + 1);
    }

    return {
      role: actor.role,
      stats: {
        bookingToday: todayBookings.length,
        revenueToday: toNumber(paidToday.reduce((sum, item) => sum + item.amount, 0)),
        bookingPending: todayBookings.filter((item) => item.status === 'pending').length,
        bookingCancelled: todayBookings.filter((item) => item.status === 'cancelled').length,
        activeStudios,
        newCustomersThisMonth: monthlyNewCustomers,
      },
      charts: {
        revenueLast7Days: Array.from(revenue7DaysMap.entries())
          .map(([date, value]) => ({ label: date, value: toNumber(value) }))
          .sort((a, b) => a.label.localeCompare(b.label)),
        monthlyBookings: Array.from(monthlyBookingMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => a.label.localeCompare(b.label)),
        busiestStudios: Array.from(studioBusyMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
      },
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        adminName: log.user?.name ?? '-',
        createdAt: log.createdAt.toISOString(),
      })),
    };
  },

  async getUsers(_actor: Actor, query: CommonQuery) {
    const { page, limit, skip } = parsePagination(query);
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      role: {
        in: ['owner', 'admin', 'manager'],
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          location: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const statusMap = await getUserStatusMap(rows.map((item) => item.id));

    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      users: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        locationId: row.locationId,
        locationName: row.location?.name ?? null,
        createdAt: row.createdAt.toISOString(),
        isActive: statusMap.get(row.id) !== false,
      })),
    };
  },

  async createUser(actor: Actor, payload: { name?: string; email?: string; password?: string; role?: string; locationId?: string | null }) {
    const name = String(payload.name ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();
    const password = String(payload.password ?? '').trim();
    const role = normalizeRoleForCreate(String(payload.role ?? 'admin'));

    if (name.length < 2) throw new Error('Nama minimal 2 karakter');
    if (!email || !email.includes('@')) throw new Error('Email tidak valid');
    if (password.length < 6) throw new Error('Password minimal 6 karakter');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email sudah terdaftar');

    const hashed = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        locationId: payload.locationId ?? null,
      },
      include: {
        location: true,
      },
    });

    await AuditLogServices.write({
      action: 'user.created',
      entityType: 'user',
      entityId: created.id,
      userId: actor.userId,
      newData: {
        email: created.email,
        role: created.role,
      },
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      locationId: created.locationId,
      locationName: created.location?.name ?? null,
      createdAt: created.createdAt.toISOString(),
      isActive: true,
    };
  },

  async updateUser(actor: Actor, userId: string, payload: { name?: string; role?: string; locationId?: string | null }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User tidak ditemukan');

    const nextRole = payload.role ? normalizeRoleForCreate(payload.role) : user.role;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        role: nextRole,
        ...(payload.locationId !== undefined ? { locationId: payload.locationId } : {}),
      },
      include: {
        location: true,
      },
    });

    await AuditLogServices.write({
      action: 'user.updated',
      entityType: 'user',
      entityId: updated.id,
      userId: actor.userId,
      oldData: {
        role: user.role,
        name: user.name,
      },
      newData: {
        role: updated.role,
        name: updated.name,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      locationId: updated.locationId,
      locationName: updated.location?.name ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  },

  async resetUserPassword(actor: Actor, userId: string, payload: { newPassword?: string }) {
    const newPassword = String(payload.newPassword ?? '').trim();
    if (newPassword.length < 6) throw new Error('Password baru minimal 6 karakter');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User tidak ditemukan');

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
      },
    });

    await AuditLogServices.write({
      action: 'user.password.reset',
      entityType: 'user',
      entityId: userId,
      userId: actor.userId,
    });

    return { success: true };
  },

  async setUserStatus(actor: Actor, userId: string, payload: { isActive?: boolean }) {
    const isActive = Boolean(payload.isActive);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User tidak ditemukan');

    await AuditLogServices.write({
      action: 'user.status.updated',
      entityType: 'user',
      entityId: userId,
      userId: actor.userId,
      newData: {
        isActive,
      },
    });

    return { success: true, isActive };
  },

  async getCustomers(_actor: Actor, query: CommonQuery) {
    const { page, limit, skip } = parsePagination(query);
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      role: 'customer',
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          bookings: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const blacklistLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'customer',
        action: 'customer.blacklist.updated',
        entityId: {
          in: rows.map((item) => item.id),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const blacklistMap = new Map<string, boolean>();
    for (const log of blacklistLogs) {
      if (blacklistMap.has(log.entityId)) continue;
      const blacklisted = (log.newData as { blacklisted?: boolean } | null)?.blacklisted;
      blacklistMap.set(log.entityId, blacklisted === true);
    }

    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      customers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.bookings[0]?.customerPhone ?? null,
        totalBookings: row._count.bookings,
        lastBookingAt: row.bookings[0]?.createdAt?.toISOString() ?? null,
        blacklisted: blacklistMap.get(row.id) === true,
      })),
    };
  },

  async getCustomerDetail(_actor: Actor, customerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      include: {
        bookings: {
          include: {
            schedule: {
              include: {
                studio: true,
              },
            },
            package: true,
            payment: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user || user.role !== 'customer') throw new Error('Customer tidak ditemukan');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      history: user.bookings.map((item) => ({
        bookingId: item.id,
        bookingCode: item.bookingCode,
        date: item.createdAt.toISOString(),
        studioName: item.schedule.studio.name,
        packageName: item.package.name,
        status: item.status,
        paymentStatus: item.payment?.status ?? 'pending',
      })),
    };
  },

  async updateCustomer(actor: Actor, customerId: string, payload: { name?: string; email?: string }) {
    const user = await prisma.user.findUnique({ where: { id: customerId } });
    if (!user || user.role !== 'customer') throw new Error('Customer tidak ditemukan');

    const updated = await prisma.user.update({
      where: { id: customerId },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.email ? { email: payload.email.trim().toLowerCase() } : {}),
      },
    });

    await AuditLogServices.write({
      action: 'customer.updated',
      entityType: 'customer',
      entityId: customerId,
      userId: actor.userId,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
    };
  },

  async setCustomerBlacklist(actor: Actor, customerId: string, payload: { blacklisted?: boolean; reason?: string }) {
    const user = await prisma.user.findUnique({ where: { id: customerId } });
    if (!user || user.role !== 'customer') throw new Error('Customer tidak ditemukan');

    const blacklisted = Boolean(payload.blacklisted);

    await AuditLogServices.write({
      action: 'customer.blacklist.updated',
      entityType: 'customer',
      entityId: customerId,
      userId: actor.userId,
      newData: {
        blacklisted,
        reason: payload.reason ?? null,
      },
    });

    return {
      id: customerId,
      blacklisted,
    };
  },

  async getTransactions(_actor: Actor, query: CommonQuery) {
    const { page, limit, skip } = parsePagination(query);
    const { start, end } = parseRange(query, 'monthly');
    const status = query.status?.trim();
    const method = query.method?.trim();
    const search = query.search?.trim();

    if (status && !PAYMENT_STATUS_VALUES.includes(status as PaymentStatus)) {
      throw new Error('Status pembayaran tidak valid');
    }
    if (method && !PAYMENT_METHOD_VALUES.includes(method as PaymentMethod)) {
      throw new Error('Metode pembayaran tidak valid');
    }

    const where: Prisma.PaymentWhereInput = {
      createdAt: {
        gte: start,
        lte: end,
      },
      ...(status ? { status: status as PaymentStatus } : {}),
      ...(method ? { method: method as PaymentMethod } : {}),
      ...(query.locationId?.trim() || query.studioId?.trim()
        ? {
            booking: {
              is: {
                ...(query.locationId?.trim() ? { locationId: query.locationId.trim() } : {}),
                ...(query.studioId?.trim()
                  ? {
                      schedule: {
                        is: {
                          studioId: query.studioId.trim(),
                        },
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
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
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const filtered = search
      ? rows.filter((item) => {
          const q = search.toLowerCase();
          return (
            item.booking.bookingCode.toLowerCase().includes(q) ||
            item.booking.customerName.toLowerCase().includes(q) ||
            (item.gatewayReference || '').toLowerCase().includes(q)
          );
        })
      : rows;

    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        totalAmount: toNumber(filtered.reduce((sum, item) => sum + item.amount, 0)),
        totalTransactions: filtered.length,
        paidAmount: toNumber(filtered.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)),
      },
      transactions: filtered.map((item) => ({
        id: item.id,
        invoice: item.gatewayReference || `INV-${item.id.slice(0, 8).toUpperCase()}`,
        bookingCode: item.booking.bookingCode,
        customer: item.booking.customerName,
        method: item.method,
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        locationName: item.booking.location.name,
        studioName: item.booking.schedule.studio.name,
      })),
    };
  },

  async confirmTransaction(actor: Actor, transactionId: string) {
    const tx = await prisma.payment.findUnique({ where: { id: transactionId } });
    if (!tx) throw new Error('Transaksi tidak ditemukan');

    const updated = await prisma.payment.update({
      where: { id: transactionId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    await AuditLogServices.write({
      action: 'transaction.confirmed',
      entityType: 'transaction',
      entityId: transactionId,
      userId: actor.userId,
      oldData: { status: tx.status },
      newData: { status: updated.status },
    });

    return {
      id: updated.id,
      status: updated.status,
      paidAt: updated.paidAt?.toISOString() ?? null,
    };
  },

  async refundTransaction(actor: Actor, transactionId: string, payload: { reason?: string }) {
    const tx = await prisma.payment.findUnique({ where: { id: transactionId } });
    if (!tx) throw new Error('Transaksi tidak ditemukan');

    const updated = await prisma.payment.update({
      where: { id: transactionId },
      data: {
        status: 'failed',
      },
    });

    await AuditLogServices.write({
      action: 'transaction.refund.requested',
      entityType: 'transaction',
      entityId: transactionId,
      userId: actor.userId,
      oldData: { status: tx.status },
      newData: { status: updated.status, reason: payload.reason ?? null },
    });

    return {
      id: updated.id,
      status: updated.status,
      refundRequested: true,
    };
  },

  async exportTransactions(_actor: Actor, query: CommonQuery) {
    const { start, end } = parseRange(query, 'monthly');

    const rows = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const csv = toCsv(
      rows.map((item) => ({
        date: item.createdAt.toISOString(),
        invoice: item.gatewayReference || `INV-${item.id.slice(0, 8).toUpperCase()}`,
        booking_code: item.booking.bookingCode,
        customer: item.booking.customerName,
        location: item.booking.location.name,
        studio: item.booking.schedule.studio.name,
        method: item.method,
        amount: item.amount,
        status: item.status,
      })),
    );

    return csv;
  },

  async getReportsDashboard(actor: Actor, query: CommonQuery) {
    return this.getDashboard(actor, query);
  },

  async getReportsRevenue(_actor: Actor, query: CommonQuery) {
    const { start, end } = parseRange(query, 'monthly');
    const period = normalizePeriod(query.period || 'daily');

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const trendMap = new Map<string, { total: number; paid: number; count: number }>();
    for (const item of payments) {
      const key = buildPeriodLabel(item.createdAt, period);
      const row = trendMap.get(key) ?? { total: 0, paid: 0, count: 0 };
      row.total += item.amount;
      row.count += 1;
      if (item.status === 'paid') {
        row.paid += item.amount;
      }
      trendMap.set(key, row);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      period,
      summary: {
        totalTransactions: payments.length,
        totalAmount: toNumber(payments.reduce((sum, item) => sum + item.amount, 0)),
        totalPaidAmount: toNumber(payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)),
      },
      revenue: Array.from(trendMap.entries())
        .map(([label, values]) => ({
          periodLabel: label,
          totalAmount: toNumber(values.total),
          paidAmount: toNumber(values.paid),
          transactionCount: values.count,
        }))
        .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
    };
  },

  async getReportsBookings(_actor: Actor, query: CommonQuery) {
    const { start, end } = parseRange(query, 'monthly');
    const period = normalizePeriod(query.period || 'daily');

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        schedule: {
          include: {
            studio: true,
          },
        },
      },
    });

    const trendMap = new Map<string, { total: number; cancelled: number }>();
    for (const booking of bookings) {
      const key = buildPeriodLabel(booking.createdAt, period);
      const row = trendMap.get(key) ?? { total: 0, cancelled: 0 };
      row.total += 1;
      if (booking.status === 'cancelled') {
        row.cancelled += 1;
      }
      trendMap.set(key, row);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      period,
      summary: {
        totalBookings: bookings.length,
        cancelRate: toPercent(bookings.filter((item) => item.status === 'cancelled').length, bookings.length),
      },
      bookings: Array.from(trendMap.entries())
        .map(([label, values]) => ({
          periodLabel: label,
          totalBookings: values.total,
          cancelBookings: values.cancelled,
          cancelRate: toPercent(values.cancelled, values.total),
        }))
        .sort((a, b) => a.periodLabel.localeCompare(b.periodLabel)),
    };
  },

  async getReportsStudioUsage(_actor: Actor, query: CommonQuery) {
    const { start, end } = parseRange(query, 'monthly');

    const schedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        studio: true,
        bookings: true,
      },
    });

    const byStudio = new Map<string, { studioId: string; studioName: string; studioType: StudioType; totalSlots: number; utilizedSlots: number }>();

    for (const schedule of schedules) {
      const row = byStudio.get(schedule.studioId) ?? {
        studioId: schedule.studioId,
        studioName: schedule.studio.name,
        studioType: schedule.studio.type,
        totalSlots: 0,
        utilizedSlots: 0,
      };
      row.totalSlots += 1;
      const latestBooking = getLatestScheduleBooking(schedule.bookings);
      if (latestBooking && BOOKING_STATUS_VALUES.includes(latestBooking.status)) {
        row.utilizedSlots += 1;
      }
      byStudio.set(schedule.studioId, row);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      summary: {
        totalStudios: byStudio.size,
        totalSlots: schedules.length,
        utilizedSlots: schedules.filter((item) => item.bookings.length > 0).length,
        studioUtilization: toPercent(schedules.filter((item) => item.bookings.length > 0).length, schedules.length),
      },
      studios: Array.from(byStudio.values())
        .map((item) => ({
          ...item,
          utilizationRate: toPercent(item.utilizedSlots, item.totalSlots),
        }))
        .sort((a, b) => b.utilizationRate - a.utilizationRate),
      serviceTypes: STUDIO_TYPE_VALUES,
    };
  },

  async getLogs(_actor: Actor, query: CommonQuery) {
    const { page, limit, skip } = parsePagination(query);
    const { start, end } = parseRange(query, 'monthly');
    const normalizedAction = query.action?.trim() || query.search?.trim();
    const normalizedUserId = query.userId?.trim();
    const where: Prisma.AuditLogWhereInput = {
      createdAt: {
        gte: start,
        lte: end,
      },
      ...(normalizedAction
        ? {
            action: {
              contains: normalizedAction,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(normalizedUserId ? { userId: normalizedUserId } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            include: {
              location: true,
            },
          },
          booking: {
            include: {
              location: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      logs: rows.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        adminName: item.user?.name ?? '-',
        adminRole: item.user?.role ?? null,
        locationName: item.user?.location?.name ?? item.booking?.location?.name ?? '-',
        bookingCode: item.booking?.bookingCode ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  },

  async getSchedules(_actor: Actor, query: CommonQuery) {
    const { start, end } = parseRange(query, 'weekly');

    const [schedules, blocks] = await Promise.all([
      prisma.schedule.findMany({
        where: {
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          studio: true,
          bookings: true,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: 'schedule_block',
          action: {
            in: ['schedule.block.created', 'schedule.block.removed'],
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const activeBlocks = new Map<string, { id: string; studioId: string; startTime: string; endTime: string; reason: string | null }>();

    for (const log of blocks) {
      if (log.action === 'schedule.block.removed') {
        activeBlocks.delete(log.entityId);
        continue;
      }

      if (activeBlocks.has(log.entityId)) {
        continue;
      }

      const payload = log.newData as { studioId?: string; startTime?: string; endTime?: string; reason?: string } | null;
      if (!payload?.studioId || !payload?.startTime || !payload?.endTime) continue;
      activeBlocks.set(log.entityId, {
        id: log.entityId,
        studioId: payload.studioId,
        startTime: payload.startTime,
        endTime: payload.endTime,
        reason: payload.reason ?? null,
      });
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      schedules: schedules.map((item) => ({
        ...(() => {
          const latestBooking = getLatestScheduleBooking(item.bookings);
          return {
            booked: Boolean(latestBooking),
            bookingId: latestBooking?.id ?? null,
            bookingCode: latestBooking?.bookingCode ?? null,
          };
        })(),
        id: item.id,
        date: item.date.toISOString(),
        startTime: item.startTime.toISOString(),
        endTime: item.endTime.toISOString(),
        studioId: item.studioId,
        studioName: item.studio.name,
        studioType: item.studio.type,
      })),
      blockedSlots: Array.from(activeBlocks.values()),
    };
  },

  async blockSchedule(actor: Actor, payload: { studioId?: string; startTime?: string; endTime?: string; reason?: string }) {
    const studioId = String(payload.studioId ?? '').trim();
    const startTime = String(payload.startTime ?? '').trim();
    const endTime = String(payload.endTime ?? '').trim();
    const reason = payload.reason?.trim() || null;

    if (!studioId || !startTime || !endTime) throw new Error('studioId, startTime, endTime wajib diisi');

    const studio = await prisma.studio.findUnique({ where: { id: studioId } });
    if (!studio) throw new Error('Studio tidak ditemukan');

    const blockId = `BLK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await AuditLogServices.write({
      action: 'schedule.block.created',
      entityType: 'schedule_block',
      entityId: blockId,
      userId: actor.userId,
      newData: {
        studioId,
        startTime,
        endTime,
        reason,
      },
    });

    return {
      id: blockId,
      studioId,
      startTime,
      endTime,
      reason,
    };
  },

  async unblockSchedule(actor: Actor, blockId: string) {
    await AuditLogServices.write({
      action: 'schedule.block.removed',
      entityType: 'schedule_block',
      entityId: blockId,
      userId: actor.userId,
    });

    return {
      success: true,
      blockId,
    };
  },

  async updateOperationalHours(actor: Actor, payload: { studioId?: string | null; openHour?: string; closeHour?: string }) {
    const studioId = payload.studioId?.trim() || 'global';
    const openHour = String(payload.openHour ?? '').trim();
    const closeHour = String(payload.closeHour ?? '').trim();

    if (!openHour || !closeHour) {
      throw new Error('openHour dan closeHour wajib diisi');
    }

    await AuditLogServices.write({
      action: 'schedule.operational_hours.updated',
      entityType: 'operational_hours',
      entityId: studioId,
      userId: actor.userId,
      newData: {
        openHour,
        closeHour,
      },
    });

    return {
      studioId,
      openHour,
      closeHour,
    };
  },
};
