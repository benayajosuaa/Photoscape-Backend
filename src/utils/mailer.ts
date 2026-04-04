import nodemailer from 'nodemailer';

function getMailConfig() {
  const mailUser = process.env.MAIL_USER;
  const mailPass = process.env.MAIL_APP_PASSWORD;

  if (!mailUser || !mailPass) {
    throw new Error('Konfigurasi email belum diisi. Set MAIL_USER dan MAIL_APP_PASSWORD di environment.');
  }

  return { mailPass, mailUser };
}

function createTransporter() {
  const { mailPass, mailUser } = getMailConfig();

  return {
    mailUser,
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: mailUser,
        pass: mailPass
      }
    })
  };
}

export async function sendEmail(params: {
  html?: string;
  subject: string;
  text: string;
  to: string;
}) {
  const { mailUser, transporter } = createTransporter();

  await transporter.sendMail({
    from: mailUser,
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(params.html ? { html: params.html } : {})
  });
}

export async function sendOTPEmail(email: string, otp: string) {
  await sendEmail({
    to: email,
    subject: 'Kode OTP',
    text: `Kode OTP kamu: ${otp}`
  });
}
