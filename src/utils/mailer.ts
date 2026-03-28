import nodemailer from 'nodemailer';

function getMailConfig() {
  const mailUser = process.env.MAIL_USER;
  const mailPass = process.env.MAIL_APP_PASSWORD;

  if (!mailUser || !mailPass) {
    throw new Error('Konfigurasi email belum diisi. Set MAIL_USER dan MAIL_APP_PASSWORD di environment.');
  }

  return { mailPass, mailUser };
}

export async function sendOTPEmail(email: string, otp: string) {
  const { mailPass, mailUser } = getMailConfig();
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailUser,
      pass: mailPass
    }
  });

  await transporter.sendMail({
    from: mailUser,
    to: email,
    subject: 'Kode OTP',
    text: `Kode OTP kamu: ${otp}`
  });
}
