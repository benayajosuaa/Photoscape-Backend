import assert from "node:assert/strict";
import test, { mock } from "node:test";
import nodemailer from "nodemailer";

test("contact: validates input and sends escaped html", async () => {
  process.env.MAIL_USER = "no-reply@example.com";
  process.env.MAIL_APP_PASSWORD = "dummy";
  process.env.CONTACT_RECEIVER_EMAIL = "owner@example.com";

  let sent: any | undefined;
  mock.method(nodemailer as any, "createTransport", () => ({
    sendMail: async (payload: any) => {
      sent = payload;
    },
  }));

  const { ContactServices } = await import("../src/services/contact.service.js");

  const res = await ContactServices.sendMessage({
    name: "Ben",
    email: "ben@example.com",
    subject: "Halo\nInjected",
    message: `Hello <script>alert("x")</script> & 'quotes'`,
  });

  assert.deepEqual(res, { ok: true });
  assert.ok(sent);
  assert.equal(sent.to, "owner@example.com");
  assert.equal(typeof sent.subject, "string");
  assert.equal(String(sent.subject).includes("\n"), false);

  // HTML should be escaped
  assert.match(sent.html, /&lt;script&gt;alert/);
  assert.match(sent.html, /&amp;/);
  assert.match(sent.html, /&#039;quotes&#039;/);

  mock.restoreAll();
});

test("contact: rejects invalid payloads", async () => {
  process.env.MAIL_USER = "no-reply@example.com";
  process.env.MAIL_APP_PASSWORD = "dummy";
  process.env.CONTACT_RECEIVER_EMAIL = "owner@example.com";

  mock.method(nodemailer as any, "createTransport", () => ({
    sendMail: async () => {
      throw new Error("should not send");
    },
  }));

  const { ContactServices } = await import("../src/services/contact.service.js");

  await assert.rejects(
    () => ContactServices.sendMessage({ name: "A", email: "a@b.com", subject: "x", message: "0123456789" }),
    /Nama minimal 2 karakter/i
  );
  await assert.rejects(
    () => ContactServices.sendMessage({ name: "Ok", email: "not-email", subject: "x", message: "0123456789" }),
    /Email tidak valid/i
  );
  await assert.rejects(
    () => ContactServices.sendMessage({ name: "Ok", email: "a@b.com", subject: "x", message: "short" }),
    /Pesan minimal 10 karakter/i
  );

  mock.restoreAll();
});

