type RefreshPayload = {
    userId: string;
    email: string;
    role: string;
    locationId?: string | null;
    locationName?: string | null;
};
export declare const RefreshTokenServices: {
    issue(payload: RefreshPayload): string;
    verify(token: string): RefreshPayload;
    revoke(token: string): void;
    rotate(token: string, payload: RefreshPayload): string;
};
export {};
//# sourceMappingURL=refresh-token.service.d.ts.map