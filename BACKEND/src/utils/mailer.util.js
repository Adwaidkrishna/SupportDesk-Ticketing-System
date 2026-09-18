import nodemailer from 'nodemailer';

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

/**
 * Sends OTP verification email.
 * C-01 FIX: OTP value is NEVER logged. Only safe metadata is logged.
 * M-06 FIX: Delivery failures are thrown so callers can handle them.
 */
export const sendOtpEmail = async (email, otpCode) => {
  const transporter = createTransporter();
  const fromEmail = process.env.FROM_EMAIL || 'noreply@supportdesk.com';
  const subject = 'SupportDesk — Verify Your Account OTP';
  const text = `Welcome to SupportDesk!\n\nYour 6-digit account verification code is: ${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;

  // SAFE LOG: recipient and subject only — OTP value is NEVER logged
  console.log(`[Mailer] OTP email dispatch initiated → ${email.substring(0, 3)}***`);

  if (!transporter) {
    console.warn('[Mailer] No SMTP transporter configured — email not sent.');
    return;
  }

  await transporter.sendMail({
    from: `SupportDesk <${fromEmail}>`,
    to: email,
    subject,
    text,
  });

  console.log(`[Mailer] OTP email delivered successfully.`);
};

/**
 * Sends password reset email.
 * C-02 FIX: Reset token value is NEVER logged. Only safe metadata is logged.
 * M-06 FIX: Delivery failures are thrown so callers can handle them.
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();
  const fromEmail = process.env.FROM_EMAIL || 'noreply@supportdesk.com';
  const subject = 'SupportDesk — Password Reset Token';
  const text = `A password reset request was received for your SupportDesk account.\n\nYour reset token is: ${resetToken}\n\nThis token expires in 15 minutes. If you did not request a password reset, please ignore this email.`;

  // SAFE LOG: recipient only — reset token value is NEVER logged
  console.log(`[Mailer] Password reset email dispatch initiated → ${email.substring(0, 3)}***`);

  if (!transporter) {
    console.warn('[Mailer] No SMTP transporter configured — email not sent.');
    return;
  }

  await transporter.sendMail({
    from: `SupportDesk <${fromEmail}>`,
    to: email,
    subject,
    text,
  });

  console.log(`[Mailer] Password reset email delivered successfully.`);
};
