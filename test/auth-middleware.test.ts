import assert from "node:assert/strict";
import test from "node:test";

process.env.SECRET_KEY = "test-secret-auth-mw";

test("auth.extractBearerToken: parses header", async () => {
  const { extractBearerToken } = await import("../src/middlewares/auth.middleware.js");

  assert.equal(extractBearerToken("Bearer abc"), "abc");
  assert.throws(() => extractBearerToken(null), /No token/i);
  assert.throws(() => extractBearerToken("Bearer"), /Invalid token format/i);
});

test("auth.authenticateExpress: attaches req.user and calls next()", async () => {
  const { generateToken } = await import("../src/utils/jwt.js");
  const { authenticateExpress } = await import("../src/middlewares/auth.middleware.js");

  const token = generateToken({
    email: "admin@example.com",
    role: "admin",
    userId: "u1",
    locationId: null,
    locationName: null,
  });

  const req: any = {
    header(name: string) {
      return name.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined;
    },
  };

  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };

  let nextCalled = false;
  await new Promise<void>(resolve => {
    authenticateExpress(req, res, () => {
      nextCalled = true;
      resolve();
    });
  });

  assert.equal(nextCalled, true);
  assert.equal(req.authToken, token);
  assert.equal(req.user.email, "admin@example.com");
  assert.equal(req.user.role, "admin");
  assert.equal(res.statusCode, 200);
});

test("auth.requireRoles: enforces authorization and role", async () => {
  const { requireRoles } = await import("../src/middlewares/auth.middleware.js");

  const handler = requireRoles("admin");

  const makeRes = () => {
    const res: any = {
      statusCode: 200,
      body: undefined as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.body = payload;
        return this;
      },
    };
    return res;
  };

  // no user
  {
    const req: any = {};
    const res = makeRes();
    let nextCalled = false;
    handler(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  }

  // wrong role
  {
    const req: any = { user: { role: "customer" } };
    const res = makeRes();
    let nextCalled = false;
    handler(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  }

  // correct role
  {
    const req: any = { user: { role: "admin" } };
    const res = makeRes();
    let nextCalled = false;
    handler(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  }
});

