import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("payment: method helpers", async () => {
  const {
    isPaymentMethod,
    isVirtualAccountMethod,
    buildTicketQrCode,
    getPaymentInstructions,
    PAYMENT_METHODS,
  } = await import("../src/services/payment.services.js");

  // Sanity check against unexpected mutation in runtime
  assert.deepEqual(PAYMENT_METHODS, ["qris", "bca_va", "mandiri_va", "gopay", "ovo", "cash"]);

  assert.ok(isPaymentMethod("qris"));
  assert.ok(!isPaymentMethod("not-a-method"));

  assert.ok(isVirtualAccountMethod("bca_va"));
  assert.ok(isVirtualAccountMethod("mandiri_va"));
  assert.ok(!isVirtualAccountMethod("qris"));

  assert.equal(buildTicketQrCode("ABC123"), "PHOTOSCAPE-TICKET:ABC123");
  assert.equal(buildTicketQrCode("ABC123", "sch-1"), "PHOTOSCAPE-TICKET:ABC123|sch-1");
  assert.equal(buildTicketQrCode("ABC123", "   "), "PHOTOSCAPE-TICKET:ABC123");

  assert.ok(getPaymentInstructions("qris").some(line => /simulasi|paymentpageurl/i.test(line)));
  assert.ok(getPaymentInstructions("bca_va").some(line => /20 detik/i.test(line)));
  assert.ok(getPaymentInstructions("gopay").some(line => /e-wallet/i.test(line)));
  assert.ok(getPaymentInstructions("cash").some(line => /cash/i.test(line)));
});

test("payment: buildPaymentExpiry adds 15 minutes", async () => {
  const { buildPaymentExpiry } = await import("../src/services/payment.services.js");

  mock.timers.enable({ apis: ["Date"], now: new Date("2026-04-23T00:00:00.000Z").getTime() });
  const expiry = buildPaymentExpiry();
  assert.equal(expiry.toISOString(), "2026-04-23T00:15:00.000Z");
  mock.timers.reset();
});
