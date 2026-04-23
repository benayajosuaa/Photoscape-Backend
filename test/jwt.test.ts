import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

process.env.SECRET_KEY = "test-secret-jwt";

test("jwt.generateToken/verifyToken: returns payload", async () => {
  const { generateToken, verifyToken } = await import("../src/utils/jwt.js");

  const token = generateToken({ userId: "u1", role: "admin" });
  const decoded = verifyToken(token);

  assert.equal(typeof decoded, "object");
  assert.equal((decoded as any).userId, "u1");
  assert.equal((decoded as any).role, "admin");
});

test("jwt.verifyToken: throws friendly message for expired token", async () => {
  const { verifyToken } = await import("../src/utils/jwt.js");

  const expired = jwt.sign({ userId: "u1" }, process.env.SECRET_KEY!, { expiresIn: -1 });
  assert.throws(() => verifyToken(expired), /Session expired/i);
});

test("jwt.revokeToken: revoked token cannot be verified", async () => {
  const { generateToken, revokeToken, verifyToken } = await import("../src/utils/jwt.js");

  const token = generateToken({ userId: "u1" });
  revokeToken(token);

  assert.throws(() => verifyToken(token), /Session sudah logout/i);
});

test("jwt.getTokenExpiration: returns ISO date", async () => {
  const { generateToken, getTokenExpiration } = await import("../src/utils/jwt.js");

  const token = generateToken({ userId: "u1" });
  const iso = getTokenExpiration(token);

  assert.equal(typeof iso, "string");
  assert.ok(!Number.isNaN(Date.parse(iso)));
});

