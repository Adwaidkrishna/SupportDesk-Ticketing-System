const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'mock_user') {
    if (
      process.env.SMTP_SERVICE === 'gmail' ||
      (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail'))
    ) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
};

const sendOtpEmail = async (email, otpCode) => {
  const transporter = createTransporter();
  const fromEmail = process.env.FROM_EMAIL || 'noreply@supportdesk.com';
  const subject = 'SupportDesk — Verify Your Account OTP';
  const text = `Welcome to SupportDesk!\n\nYour 6-digit account verification code is: ${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;

  console.log(`\n========================================`);
  console.log(`[EMAIL DISPATCH] To: ${email}`);
  console.log(`[EMAIL DISPATCH] Subject: ${subject}`);
  console.log(`[EMAIL DISPATCH] OTP Code: ${otpCode}`);
  console.log(`========================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `SupportDesk <${fromEmail}>`,
        to: email,
        subject,
        text,
      });
    } catch (err) {
      console.error(`[Mailer Error] Failed to send email to ${email}:`, err.message);
    }
  }
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();
  const fromEmail = process.env.FROM_EMAIL || 'noreply@supportdesk.com';
  const subject = 'SupportDesk — Password Reset Token';
  const text = `A password reset request was received for your SupportDesk account.\n\nYour reset token is: ${resetToken}\n\nThis token expires in 15 minutes.`;

  console.log(`\n========================================`);
  console.log(`[EMAIL DISPATCH] To: ${email}`);
  console.log(`[EMAIL DISPATCH] Subject: ${subject}`);
  console.log(`[EMAIL DISPATCH] Reset Token: ${resetToken}`);
  console.log(`========================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `SupportDesk <${fromEmail}>`,
        to: email,
        subject,
        text,
      });
    } catch (err) {
      console.error(`[Mailer Error] Failed to send reset email to ${email}:`, err.message);
    }
  }
};

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
};
