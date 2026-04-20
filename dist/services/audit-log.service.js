import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';
export const AuditLogServices = {
    async write(payload) {
        try {
            await prisma.auditLog.create({
                data: {
                    action: payload.action,
                    entityType: payload.entityType,
                    entityId: payload.entityId,
                    userId: payload.userId ?? null,
                    bookingId: payload.bookingId ?? null,
                    oldData: payload.oldData === undefined ? Prisma.JsonNull : payload.oldData,
                    newData: payload.newData === undefined ? Prisma.JsonNull : payload.newData,
                },
            });
        }
        catch (error) {
            console.error('[audit] failed to write log', error);
        }
    },
};
//# sourceMappingURL=audit-log.service.js.map