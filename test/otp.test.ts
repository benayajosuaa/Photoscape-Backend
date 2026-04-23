import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("otp.generateOTP/verifyOTP: accepts correct OTP and deletes it", async () => {
  const { generateOTP, verifyOTP } = await import("../src/services/otp.service.js");

  mock.method(Math, "random", () => 0); // deterministic -> 100000
  mock.timers.enable({ apis: ["Date"], now: 0 });

  const otp = generateOTP("user@example.com");
  assert.equal(otp, "100000");

  assert.equal(verifyOTP("user@example.com", "999999"), false);
  assert.equal(verifyOTP("user@example.com", otp), true);
  assert.equal(verifyOTP("user@example.com", otp), false);

  mock.timers.reset();
  mock.restoreAll();
});

test("otp.verifyOTP: expires after 5 minutes", async () => {
  const { generateOTP, verifyOTP } = await import("../src/services/otp.service.js");

  mock.method(Math, "random", () => 0);
  mock.timers.enable({ apis: ["Date"], now: 0 });

  const otp = generateOTP("user2@example.com");
  mock.timers.tick(5 * 60 * 1000 + 1);

  assert.equal(verifyOTP("user2@example.com", otp), false);

  mock.timers.reset();
  mock.restoreAll();
});

