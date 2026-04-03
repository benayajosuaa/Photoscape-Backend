export declare const USER_ROLES: readonly ["customer", "admin", "manager", "owner"];
export type UserRole = (typeof USER_ROLES)[number];
export declare function isValidUserRole(role: string): role is UserRole;
export declare function startRegistration(name: string, email: string, password: string): Promise<{
    email: string;
    name: string;
}>;
export declare function completeRegistration(email: string): Promise<{
    createdAt: Date;
    email: string;
    id: string;
    location: {
        id: string;
        name: string;
    } | null;
    locationId: string | null;
    name: string;
    role: UserRole;
}>;
export declare function loginUser(email: string, password: string): Promise<{
    token: string;
    user: {
        createdAt: Date;
        email: string;
        id: string;
        location: {
            id: string;
            name: string;
        } | null;
        locationId: string | null;
        name: string;
        role: UserRole;
    };
}>;
export declare function hasPendingRegistration(email: string): boolean;
export declare function findUserByEmail(email: string): Promise<{
    createdAt: Date;
    email: string;
    id: string;
    location: {
        id: string;
        name: string;
    } | null;
    locationId: string | null;
    name: string;
    role: UserRole;
} | null>;
export declare function assignUserRole(email: string, role: UserRole): Promise<{
    createdAt: Date;
    email: string;
    id: string;
    location: {
        id: string;
        name: string;
    } | null;
    locationId: string | null;
    name: string;
    role: UserRole;
}>;
export declare function seedPrivilegedUser(params: {
    email: string | undefined;
    locationName?: string | undefined;
    name: string | undefined;
    password: string | undefined;
    role: UserRole;
}): Promise<{
    createdAt: Date;
    email: string;
    id: string;
    location: {
        id: string;
        name: string;
    } | null;
    locationId: string | null;
    name: string;
    role: UserRole;
} | null>;
//# sourceMappingURL=auth.service.d.ts.map