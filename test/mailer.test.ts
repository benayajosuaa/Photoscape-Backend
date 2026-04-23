import assert from "node:assert/strict";
import test, { mock } from "node:test";
import nodemailer from "nodemailer";

test("mailer.sendEmail: throws when env not configured", async () => {
  const { sendEmail } = await import("../src/utils/mailer.js");

  const oldUser = process.env.MAIL_USER;
  const oldPass = process.env.MAIL_APP_PASSWORD;

  delete process.env.MAIL_USER;
  delete process.env.MAIL_APP_PASSWORD;

  await assert.rejects(
    () => sendEmail({ to: "a@b.com", subject: "x", text: "y" }),
    /Konfigurasi email belum diisi/i
  );

  if (oldUser) process.env.MAIL_USER = oldUser;
  if (oldPass) process.env.MAIL_APP_PASSWORD = oldPass;
});

test("mailer.sendOTPEmail: sends expected email payload", async () => {
  process.env.MAIL_USER = "no-reply@example.com";
  process.env.MAIL_APP_PASSWORD = "dummy";

  let sent: any | undefined;
  mock.method(nodemailer as any, "createTransport", () => ({
    sendMail: async (payload: any) => {
      sent = payload;
    },
  }));

  const { sendOTPEmail } = await import("../src/utils/mailer.js");
  await sendOTPEmail("user@example.com", "123456");

  assert.ok(sent);
  assert.equal(sent.from, "no-reply@example.com");
  assert.equal(sent.to, "user@example.com");
  assert.equal(sent.subject, "Kode OTP");
  assert.match(sent.text, /123456/);

  mock.restoreAll();
});

