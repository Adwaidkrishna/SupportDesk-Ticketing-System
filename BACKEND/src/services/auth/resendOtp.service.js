import User from '../../models/User.js';
import Otp from '../../models/Otp.js';
import { generateOtp } from '../../utils/otp.util.js';
import { sendOtpEmail } from '../../utils/mailer.util.js';
import { sha256 } from './helpers.js';

/**
 * Service: Resend OTP
 */
export const resendOtp = async ({ email }) => {
  if (!email) {
    const err = new Error('Email address is required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Generic 400 for not-found — avoids email enumeration
  if (!user) {
    const err = new Error('Cannot send OTP. Please check your email and try again.');
    err.statusCode = 400;
    throw err;
  }

  if (user.isVerified) {
    const err = new Error('Account is already verified.');
    err.statusCode = 400;
    throw err;
  }

  // Rate limit check: 60-second cooldown per user
  const recentOtp = await Otp.findOne({
    userId: user._id,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });

  if (recentOtp) {
    const err = new Error('Please wait 60 seconds before requesting another OTP.');
    err.statusCode = 429;
    throw err;
  }

  // Invalidate all previous OTPs
  await Otp.deleteMany({ userId: user._id });

  // Generate new OTP
  const newOtp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Store SHA-256 hash — NEVER the raw OTP
  const otpHash = sha256(newOtp);
  await Otp.create({
    userId: user._id,
    code: otpHash,
    expiresAt,
  });

  // Throw on delivery failure
  try {
    await sendOtpEmail(normalizedEmail, newOtp);
  } catch (mailErr) {
    await Otp.deleteMany({ userId: user._id });
    const err = new Error('Failed to send verification email. Please try again.');
    err.statusCode = 503;
    throw err;
  }

  return {
    message: 'New verification OTP sent to your email.',
  };
};
