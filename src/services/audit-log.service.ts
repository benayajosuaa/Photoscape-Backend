import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

type AuditPayload = {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  bookingId?: string | null;
  oldData?: unknown;
  newData?: unknown;
};

export const AuditLogServices = {
  async write(payload: AuditPayload) {
    try {
      await prisma.auditLog.create({
        data: {
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          userId: payload.userId ?? null,
          bookingId: payload.bookingId ?? null,
          oldData: payload.oldData === undefined ? Prisma.JsonNull : (payload.oldData as Prisma.InputJsonValue),
          newData: payload.newData === undefined ? Prisma.JsonNull : (payload.newData as Prisma.InputJsonValue),
        },
      });
    } catch (error) {
      console.error('[audit] failed to write log', error);
    }
  },
};
