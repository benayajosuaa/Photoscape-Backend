const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Jakarta";

function getRequiredPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPart["type"]) {
  const part = parts.find(item => item.type === type)?.value;
  if (!part) {
    throw new Error(`Failed to read ${type} from Intl.DateTimeFormat`);
  }
  return part;
}

export function getBusinessTimeZone() {
  const candidate = process.env.BUSINESS_TIME_ZONE?.trim();
  if (!candidate) return DEFAULT_BUSINESS_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(0);
    return candidate;
  } catch {
    return DEFAULT_BUSINESS_TIME_ZONE;
  }
}

/**
 * Converts an instant into a Date whose UTC components represent the wall-clock
 * time in the given IANA time zone.
 *
 * This matches how schedules are stored/seeded in this codebase (UTC clock as local time).
 */
export function toUtcClockInTimeZone(instant: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(instant);
  const year = Number(getRequiredPart(parts, "year"));
  const month = Number(getRequiredPart(parts, "month"));
  const day = Number(getRequiredPart(parts, "day"));
  const hour = Number(getRequiredPart(parts, "hour"));
  const minute = Number(getRequiredPart(parts, "minute"));
  const second = Number(getRequiredPart(parts, "second"));

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, instant.getMilliseconds()));
}

export function getNowScheduleClock(instant: Date = new Date()) {
  return toUtcClockInTimeZone(instant, getBusinessTimeZone());
}
