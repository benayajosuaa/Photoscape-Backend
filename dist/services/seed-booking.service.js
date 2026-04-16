import { prisma } from "../utils/prisma.js";
const LOCATION_NAMES = ["Jakarta", "Surabaya", "Medan"];
const STUDIO_SEEDS = [
    { locationName: "Jakarta", name: "Studio K1 Jakarta", type: "K1", capacity: 5 },
    { locationName: "Jakarta", name: "Studio K2 Jakarta", type: "K2", capacity: 15 },
    { locationName: "Jakarta", name: "Photo Box 1 Jakarta", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Jakarta", name: "Photo Box 2 Jakarta", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Jakarta", name: "Photo Box 3 Jakarta", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Jakarta", name: "Photo Box 4 Jakarta", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Jakarta", name: "Self Photo 1 Jakarta", type: "SELF_PHOTO", capacity: 10 },
    { locationName: "Jakarta", name: "Self Photo 2 Jakarta", type: "SELF_PHOTO", capacity: 10 },
    { locationName: "Surabaya", name: "Studio K1 Surabaya", type: "K1", capacity: 5 },
    { locationName: "Surabaya", name: "Studio K2 Surabaya", type: "K2", capacity: 15 },
    { locationName: "Surabaya", name: "Photo Box 1 Surabaya", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Surabaya", name: "Photo Box 2 Surabaya", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Surabaya", name: "Photo Box 3 Surabaya", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Surabaya", name: "Photo Box 4 Surabaya", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Surabaya", name: "Self Photo 1 Surabaya", type: "SELF_PHOTO", capacity: 10 },
    { locationName: "Surabaya", name: "Self Photo 2 Surabaya", type: "SELF_PHOTO", capacity: 10 },
    { locationName: "Medan", name: "Studio K1 Medan", type: "K1", capacity: 5 },
    { locationName: "Medan", name: "Studio K2 Medan", type: "K2", capacity: 15 },
    { locationName: "Medan", name: "Photo Box 1 Medan", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Medan", name: "Photo Box 2 Medan", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Medan", name: "Photo Box 3 Medan", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Medan", name: "Photo Box 4 Medan", type: "PHOTO_BOX", capacity: 4 },
    { locationName: "Medan", name: "Self Photo 1 Medan", type: "SELF_PHOTO", capacity: 10 },
    { locationName: "Medan", name: "Self Photo 2 Medan", type: "SELF_PHOTO", capacity: 10 },
];
const PACKAGE_SEEDS = [
    { name: "Family Lite", price: 220000, durationMinutes: 60, maxCapacity: 4 },
    { name: "Family Deluxe", price: 400000, durationMinutes: 60, maxCapacity: 6 },
    { name: "Family Premium", price: 630000, durationMinutes: 90, maxCapacity: 8 },
    { name: "Photo Box Express", price: 120000, durationMinutes: 30, maxCapacity: 3 },
    { name: "Self Photo Regular", price: 180000, durationMinutes: 45, maxCapacity: 4 },
];
const ADD_ON_SEEDS = [
    { name: "Tambah Orang", price: 50000 },
    { name: "Cetak Foto 8R", price: 50000 },
];
const DAILY_TIME_SLOTS = [
    { startHour: 9, durationMinutes: 60 },
    { startHour: 10, durationMinutes: 60 },
    { startHour: 11, durationMinutes: 60 },
    { startHour: 12, durationMinutes: 60 },
    { startHour: 13, durationMinutes: 60 },
    { startHour: 14, durationMinutes: 60 },
    { startHour: 15, durationMinutes: 60 },
    { startHour: 16, durationMinutes: 60 },
    { startHour: 17, durationMinutes: 60 },
];
const SCHEDULE_SEED_DAYS_AHEAD = Number(process.env.SCHEDULE_SEED_DAYS_AHEAD ?? 30);
const SCHEDULE_INCLUDE_TODAY = process.env.SCHEDULE_INCLUDE_TODAY !== "false";
function atUtcDayOffset(daysFromNow) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromNow, 0, 0, 0, 0));
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}
export const SeedBookingServices = {
    async run() {
        console.log("Seeding locations...");
        const locations = new Map();
        for (const locationName of LOCATION_NAMES) {
            const existing = await prisma.location.findFirst({
                where: { name: locationName },
            });
            if (existing) {
                locations.set(locationName, existing.id);
                continue;
            }
            const location = await prisma.location.create({
                data: { name: locationName },
            });
            locations.set(locationName, location.id);
        }
        console.log(`Locations ready: ${locations.size}`);
        console.log("Seeding studios...");
        for (const studioSeed of STUDIO_SEEDS) {
            const locationId = locations.get(studioSeed.locationName);
            if (!locationId) {
                throw new Error(`Location ${studioSeed.locationName} tidak ditemukan`);
            }
            const existing = await prisma.studio.findFirst({
                where: {
                    name: studioSeed.name,
                    locationId,
                },
            });
            if (existing) {
                await prisma.studio.update({
                    where: { id: existing.id },
                    data: {
                        type: studioSeed.type,
                        capacity: studioSeed.capacity,
                        isActive: true,
                    },
                });
                continue;
            }
            await prisma.studio.create({
                data: {
                    name: studioSeed.name,
                    type: studioSeed.type,
                    capacity: studioSeed.capacity,
                    isActive: true,
                    locationId,
                },
            });
        }
        console.log(`Studios processed: ${STUDIO_SEEDS.length}`);
        console.log("Seeding packages...");
        for (const packageSeed of PACKAGE_SEEDS) {
            const existing = await prisma.photoPackage.findFirst({
                where: { name: packageSeed.name },
            });
            if (existing) {
                await prisma.photoPackage.update({
                    where: { id: existing.id },
                    data: {
                        price: packageSeed.price,
                        durationMinutes: packageSeed.durationMinutes,
                        maxCapacity: packageSeed.maxCapacity,
                    },
                });
                continue;
            }
            await prisma.photoPackage.create({
                data: packageSeed,
            });
        }
        console.log(`Packages processed: ${PACKAGE_SEEDS.length}`);
        console.log("Seeding add-ons...");
        for (const addOnSeed of ADD_ON_SEEDS) {
            const existing = await prisma.addOn.findFirst({
                where: { name: addOnSeed.name },
            });
            if (existing) {
                await prisma.addOn.update({
                    where: { id: existing.id },
                    data: {
                        price: addOnSeed.price,
                    },
                });
                continue;
            }
            await prisma.addOn.create({
                data: addOnSeed,
            });
        }
        console.log(`Add-ons processed: ${ADD_ON_SEEDS.length}`);
        console.log("Loading studios for schedules...");
        const studios = await prisma.studio.findMany({
            where: {
                isActive: true,
            },
            select: {
                id: true,
            },
        });
        console.log(`Studios loaded for schedules: ${studios.length}`);
        console.log("Seeding schedules...");
        let processedSchedules = 0;
        const startOffset = SCHEDULE_INCLUDE_TODAY ? 0 : 1;
        const endOffset = Math.max(startOffset, SCHEDULE_SEED_DAYS_AHEAD);
        for (const studio of studios) {
            console.log(`Seeding schedules for studio ${studio.id}...`);
            const scheduleRows = [];
            for (let dayOffset = startOffset; dayOffset <= endOffset; dayOffset += 1) {
                const day = atUtcDayOffset(dayOffset);
                for (const slot of DAILY_TIME_SLOTS) {
                    const startTime = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), slot.startHour, 0, 0, 0));
                    const endTime = addMinutes(startTime, slot.durationMinutes);
                    scheduleRows.push({
                        studioId: studio.id,
                        date: day,
                        startTime,
                        endTime,
                    });
                }
            }
            if (scheduleRows.length > 0) {
                await prisma.schedule.createMany({
                    data: scheduleRows,
                    skipDuplicates: true,
                });
            }
            processedSchedules += scheduleRows.length;
        }
        console.log(`Schedules processed: ${processedSchedules}`);
        const [locationCount, studioCount, packageCount, addOnCount, scheduleCount] = await Promise.all([
            prisma.location.count(),
            prisma.studio.count(),
            prisma.photoPackage.count(),
            prisma.addOn.count(),
            prisma.schedule.count(),
        ]);
        return {
            locationCount,
            studioCount,
            packageCount,
            addOnCount,
            scheduleCount,
        };
    },
};
//# sourceMappingURL=seed-booking.service.js.map