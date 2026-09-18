import User from '../../models/User.js';
import Otp from '../../models/Otp.js';
import { hashPassword } from '../../utils/hash.util.js';
import { generateOtp } from '../../utils/otp.util.js';
import { sendOtpEmail } from '../../utils/mailer.util.js';
import { sha256, validatePasswordStrength } from './helpers.js';

/**
 * Service: Register new user
 */
export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    const err = new Error('Name, email, and password are required.');
    err.statusCode = 400;
    throw err;
  }

  // Server-side password validation
  validatePasswordStrength(password);

  const normalizedEmail = email.toLowerCase().trim();

  // Input type validation — prevent NoSQL injection via objects
  if (typeof normalizedEmail !== 'string' || typeof name !== 'string') {
    const err = new Error('Invalid input types.');
    err.statusCode = 400;
    throw err;
  }

  // Check existing user
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const err = new Error('An account with this email address already exists.');
    err.statusCode = 409;
    throw err;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create unverified user
  const user = await User.create({
    name: name.trim().substring(0, 100), // Sanitize length
    email: normalizedEmail,
    passwordHash,
    role: 'customer',
    isVerified: false,
  });

  // Generate 6-digit OTP
  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Store SHA-256 hash of OTP — NEVER the raw OTP
  const otpHash = sha256(otpCode);
  await Otp.create({
    userId: user._id,
    code: otpHash,
    expiresAt,
  });

  // Send raw OTP via email — will throw if delivery fails
  try {
    await sendOtpEmail(normalizedEmail, otpCode);
  } catch (mailErr) {
    // Roll back: delete the newly created OTP and user to keep DB consistent
    await Otp.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
    const err = new Error('Failed to send verification email. Please try again.');
    err.statusCode = 503;
    throw err;
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
    message: 'Registration successful! Verification OTP sent to your email.',
  };
};
