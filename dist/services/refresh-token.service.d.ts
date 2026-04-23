type RefreshPayload = {
    userId: string;
    email: string;
    role: string;
    locationId?: string | null;
    locationName?: string | null;
};
declare function issue(payload: RefreshPayload): string;
declare function verify(token: string): RefreshPayload;
declare function revoke(token: string): void;
declare function rotate(token: string, payload: RefreshPayload): string;
export declare const RefreshTokenServices: {
    issue: typeof issue;
    verify: typeof verify;
    revoke: typeof revoke;
    rotate: typeof rotate;
};
export {};
//# sourceMappingURL=refresh-token.service.d.ts.map