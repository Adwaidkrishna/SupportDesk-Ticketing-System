import User from '../../models/User.js';
import Otp from '../../models/Otp.js';
import { sha256 } from './helpers.js';

/**
 * Service: Verify OTP
 */
export const verifyOtp = async ({ email, otp }) => {
  if (!email || !otp) {
    const err = new Error('Email and OTP code are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Generic 400 for not-found — avoids email enumeration
  if (!user) {
    const err = new Error('Invalid email or OTP code.');
    err.statusCode = 400;
    throw err;
  }

  if (user.isVerified) {
    return { message: 'Account is already verified. You can log in directly.' };
  }

  // Hash the submitted OTP and compare against stored hash
  const submittedHash = sha256(otp);

  const activeOtp = await Otp.findOne({
    userId: user._id,
    code: submittedHash,
    expiresAt: { $gt: new Date() },
  });

  if (!activeOtp) {
    const err = new Error('Invalid or expired OTP code.');
    err.statusCode = 400;
    throw err;
  }

  // Mark user verified
  user.isVerified = true;
  await user.save();

  // Invalidate all OTPs for this user
  await Otp.deleteMany({ userId: user._id });

  return {
    message: 'Account verified successfully! You can now log in.',
  };
};
