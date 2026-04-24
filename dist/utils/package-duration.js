export const FIXED_SESSION_DURATION_MINUTES = 50;
export const PHOTOBOX_SESSION_DURATION_MINUTES = 25;
export function inferPackageTypeFromName(name) {
    const normalized = String(name ?? "").toLowerCase();
    if (normalized.includes("family"))
        return "studio";
    if (normalized.includes("self photo") || normalized.includes("selfphoto") || normalized.includes("group")) {
        return "selfphoto";
    }
    if (normalized.includes("photo box") || normalized.includes("photobox"))
        return "photobox";
    return null;
}
export function getEffectivePackageDurationMinutes(photoPackage) {
    const type = inferPackageTypeFromName(photoPackage.name);
    if (type === "studio" || type === "selfphoto") {
        return FIXED_SESSION_DURATION_MINUTES;
    }
    if (type === "photobox") {
        return PHOTOBOX_SESSION_DURATION_MINUTES;
    }
    return photoPackage.durationMinutes;
}
//# sourceMappingURL=package-duration.js.map