type AuditPayload = {
    action: string;
    entityType: string;
    entityId: string;
    userId?: string | null;
    bookingId?: string | null;
    oldData?: unknown;
    newData?: unknown;
};
export declare const AuditLogServices: {
    write(payload: AuditPayload): Promise<void>;
};
export {};
//# sourceMappingURL=audit-log.service.d.ts.map