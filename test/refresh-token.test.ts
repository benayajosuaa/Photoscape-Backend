import assert from "node:assert/strict";
import test, { mock } from "node:test";

process.env.REFRESH_SECRET_KEY = "test-refresh-secret";
process.env.REFRESH_EXPIRES_IN = "1s";

test.afterEach(() => {
  try {
    mock.timers.reset();
  } catch {
    // ignore
  }
  mock.restoreAll();
});

test("refresh tokens: issue/verify/revoke/rotate", async () => {
  const { RefreshTokenServices } = await import("../src/services/refresh-token.service.js");

  mock.timers.enable({ apis: ["Date"], now: 0 });

  const payload = { userId: "u1", email: "a@b.com", role: "admin" };
  const token = RefreshTokenServices.issue(payload);

  const verified = RefreshTokenServices.verify(token);
  assert.equal(verified.userId, "u1");
  assert.equal(verified.email, "a@b.com");
  assert.equal(verified.role, "admin");

  RefreshTokenServices.revoke(token);
  let revokeThrows = false;
  try {
    RefreshTokenServices.verify(token);
  } catch {
    revokeThrows = true;
  }
  assert.ok(revokeThrows, "verify(token) should throw after revoke(token)");

  const token2 = RefreshTokenServices.issue(payload);
  // Ensure the rotated token gets a different iat/exp (jsonwebtoken uses seconds)
  mock.timers.tick(1100);
  const rotated = RefreshTokenServices.rotate(token2, payload);
  assert.notEqual(rotated, token2);
  let rotateOldThrows = false;
  try {
    RefreshTokenServices.verify(token2);
  } catch {
    rotateOldThrows = true;
  }
  assert.ok(rotateOldThrows, "verify(token2) should throw after rotate(token2)");
  assert.equal(RefreshTokenServices.verify(rotated).userId, "u1");
});

test("refresh tokens: expire based on time", async () => {
  const { RefreshTokenServices } = await import("../src/services/refresh-token.service.js");

  mock.timers.enable({ apis: ["Date"], now: 0 });
  const token = RefreshTokenServices.issue({ userId: "u2", email: "u2@b.com", role: "customer" });

  mock.timers.tick(1200);
  assert.throws(() => RefreshTokenServices.verify(token), /expired/i);
});
