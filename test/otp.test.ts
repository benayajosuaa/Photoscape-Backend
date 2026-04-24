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

test("otp.verifyOTP: expires after 2 minutes", async () => {
  const { generateOTP, verifyOTP } = await import("../src/services/otp.service.js");

  mock.method(Math, "random", () => 0);
  mock.timers.enable({ apis: ["Date"], now: 0 });

  const otp = generateOTP("user2@example.com");
  mock.timers.tick(2 * 60 * 1000 + 1);

  assert.equal(verifyOTP("user2@example.com", otp), false);

  mock.timers.reset();
  mock.restoreAll();
});

test("otp.resendOTP: blocks resend while active, allows after expiry", async () => {
  const { generateOTP, resendOTP } = await import("../src/services/otp.service.js");

  let randomValue = 0;
  mock.method(Math, "random", () => randomValue);
  mock.timers.enable({ apis: ["Date"], now: 0 });

  const otp1 = generateOTP("user3@example.com");
  assert.equal(otp1, "100000");

  assert.throws(() => resendOTP("user3@example.com"), /OTP masih aktif/);

  randomValue = 0.5; // deterministic-ish -> 550000
  mock.timers.tick(2 * 60 * 1000 + 1);

  const otp2 = resendOTP("user3@example.com");
  assert.notEqual(otp2, otp1);

  mock.timers.reset();
  mock.restoreAll();
});
