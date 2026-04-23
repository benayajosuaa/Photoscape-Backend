import assert from "node:assert/strict";
import test from "node:test";

test("business-time: getBusinessTimeZone falls back to Asia/Jakarta", async () => {
  const { getBusinessTimeZone } = await import("../src/utils/business-time.js");

  delete process.env.BUSINESS_TIME_ZONE;
  assert.equal(getBusinessTimeZone(), "Asia/Jakarta");

  process.env.BUSINESS_TIME_ZONE = "Invalid/Zone";
  assert.equal(getBusinessTimeZone(), "Asia/Jakarta");
});

test("business-time: toUtcClockInTimeZone maps instant to UTC clock in zone", async () => {
  const { toUtcClockInTimeZone } = await import("../src/utils/business-time.js");

  const instant = new Date("2026-04-23T00:00:00.000Z");
  const converted = toUtcClockInTimeZone(instant, "Asia/Jakarta"); // UTC+7

  assert.equal(converted.toISOString(), "2026-04-23T07:00:00.000Z");
});

test("business-time: getNowScheduleClock uses configured zone", async () => {
  const { getNowScheduleClock } = await import("../src/utils/business-time.js");

  process.env.BUSINESS_TIME_ZONE = "Asia/Jakarta";
  const instant = new Date("2026-04-23T10:30:15.000Z");

  // Jakarta is +7 -> wall clock 17:30:15, returned as UTC components
  assert.equal(getNowScheduleClock(instant).toISOString(), "2026-04-23T17:30:15.000Z");
});

