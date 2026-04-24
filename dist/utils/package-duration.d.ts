export type PackageType = "studio" | "photobox" | "selfphoto";
export declare const FIXED_SESSION_DURATION_MINUTES = 50;
export declare const PHOTOBOX_SESSION_DURATION_MINUTES = 25;
export declare function inferPackageTypeFromName(name: string): PackageType | null;
export declare function getEffectivePackageDurationMinutes(photoPackage: {
    name: string;
    durationMinutes: number;
}): number;
//# sourceMappingURL=package-duration.d.ts.map