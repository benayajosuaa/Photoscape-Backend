export declare function getBusinessTimeZone(): string;
/**
 * Converts an instant into a Date whose UTC components represent the wall-clock
 * time in the given IANA time zone.
 *
 * This matches how schedules are stored/seeded in this codebase (UTC clock as local time).
 */
export declare function toUtcClockInTimeZone(instant: Date, timeZone: string): Date;
export declare function getNowScheduleClock(instant?: Date): Date;
//# sourceMappingURL=business-time.d.ts.map