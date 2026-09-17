const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const PasswordReset = require('../models/PasswordReset');
const { hashPassword, comparePassword } = require('../utils/hash.util');
const { generateToken } = require('../utils/jwt.util');
const { generateOtp, generateResetToken } = require('../utils/otp.util');
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/mailer.util');

// ─── Secure hashing helpers ──────────────────────────────────────────────────

/**
 * C-03 / C-04 FIX:
 * One-way SHA-256 hash for OTPs and password-reset tokens.
 * Raw values are NEVER stored in the database.
 * Comparison is done by hashing the submitted value and comparing hashes.
 */
const sha256 = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

// ─── Password validation ─────────────────────────────────────────────────────

/**
 * M-01 FIX: Server-side password validation.
 * Frontend validation is for UX; this is the authoritative enforcement.
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    const err = new Error('Password is required and must be a string.');
    err.statusCode = 400;
    throw err;
  }
  if (password.length < 8) {
    const err = new Error('Password must be at least 8 characters long.');
    err.statusCode = 400;
    throw err;
  }
  if (password.length > 128) {
    const err = new Error('Password must not exceed 128 characters.');
    err.statusCode = 400;
    throw err;
  }
};

// ─── Service: Register ───────────────────────────────────────────────────────

/**
 * Service: Register new user
 */
const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    const err = new Error('Name, email, and password are required.');
    err.statusCode = 400;
    throw err;
  }

  // M-01 FIX: Server-side password validation
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

  // C-03 FIX: Store SHA-256 hash of OTP — NEVER the raw OTP
  const otpHash = sha256(otpCode);
  await Otp.create({
    userId: user._id,
    code: otpHash,
    expiresAt,
  });

  // Send raw OTP via email — will throw if delivery fails (M-06 FIX)
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

// ─── Service: Verify OTP ─────────────────────────────────────────────────────

/**
 * Service: Verify OTP
 */
const verifyOtp = async ({ email, otp }) => {
  if (!email || !otp) {
    const err = new Error('Email and OTP code are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // M-05 FIX: Generic 400 for not-found — avoids email enumeration
  if (!user) {
    const err = new Error('Invalid email or OTP code.');
    err.statusCode = 400;
    throw err;
  }

  if (user.isVerified) {
    return { message: 'Account is already verified. You can log in directly.' };
  }

  // C-03 FIX: Hash the submitted OTP and compare against stored hash
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

// ─── Service: Resend OTP ─────────────────────────────────────────────────────

/**
 * Service: Resend OTP
 */
const resendOtp = async ({ email }) => {
  if (!email) {
    const err = new Error('Email address is required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // M-05 FIX: Generic 400 for not-found — avoids email enumeration
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

  // C-03 FIX: Store SHA-256 hash — NEVER the raw OTP
  const otpHash = sha256(newOtp);
  await Otp.create({
    userId: user._id,
    code: otpHash,
    expiresAt,
  });

  // M-06 FIX: Throw on delivery failure
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

// ─── Service: Login ──────────────────────────────────────────────────────────

/**
 * Service: User Login
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
    throw err;
  }

  // Type check to prevent NoSQL injection
  if (typeof email !== 'string' || typeof password !== 'string') {
    const err = new Error('Invalid email address or password.');
    err.statusCode = 401;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const err = new Error('Invalid email address or password.');
    err.statusCode = 401;
    throw err;
  }

  // Compare password
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error('Invalid email address or password.');
    err.statusCode = 401;
    throw err;
  }

  // Check verification
  if (!user.isVerified) {
    const err = new Error('Account is not verified. Please verify your OTP first.');
    err.statusCode = 403;
    err.requiresOtp = true;
    throw err;
  }

  // Generate JWT with minimal identity claims
  const token = generateToken({
    userId: user._id,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
    message: 'Login successful!',
  };
};

// ─── Service: Forgot Password ────────────────────────────────────────────────

/**
 * Service: Forgot Password
 * M-04 FIX: Always returns the same generic message regardless of account existence.
 */
const FORGOT_PASSWORD_MESSAGE =
  'If an account with that email exists, a password reset link has been sent.';

const forgotPassword = async ({ email }) => {
  if (!email) {
    const err = new Error('Email address is required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // M-04 FIX: Return IDENTICAL message regardless of user existence
  if (!user) {
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  // Invalidate previous reset tokens
  await PasswordReset.deleteMany({ userId: user._id });

  // Generate raw reset token (expires in 15 mins)
  const resetToken = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // C-04 FIX: Store SHA-256 hash of token — NEVER the raw token
  const tokenHash = sha256(resetToken);
  await PasswordReset.create({
    userId: user._id,
    token: tokenHash,
    expiresAt,
    used: false,
  });

  // M-06 FIX: Surface delivery failure (but keep message generic to user)
  try {
    await sendPasswordResetEmail(normalizedEmail, resetToken);
  } catch (mailErr) {
    await PasswordReset.deleteMany({ userId: user._id });
    console.error('[Auth] Password reset email delivery failed:', mailErr.message);
    // M-04 FIX: Even on failure, return same generic message (don't reveal existence)
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  // M-04 FIX: Return IDENTICAL message for both found and not-found
  return { message: FORGOT_PASSWORD_MESSAGE };
};

// ─── Service: Reset Password ─────────────────────────────────────────────────

/**
 * Service: Reset Password
 */
const resetPassword = async ({ email, token, newPassword }) => {
  if (!email || !token || !newPassword) {
    const err = new Error('Email, token, and new password are required.');
    err.statusCode = 400;
    throw err;
  }

  // M-01 FIX: Server-side password validation on reset too
  validatePasswordStrength(newPassword);

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const err = new Error('Invalid email or reset token.');
    err.statusCode = 400;
    throw err;
  }

  // C-04 FIX: Hash submitted token and compare against stored hash
  const submittedTokenHash = sha256(token);

  const resetRecord = await PasswordReset.findOne({
    userId: user._id,
    token: submittedTokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    const err = new Error('Invalid or expired password reset token.');
    err.statusCode = 400;
    throw err;
  }

  // Update user password
  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  // Mark token used — prevents replay
  resetRecord.used = true;
  await resetRecord.save();

  return {
    message: 'Password reset successfully! You can now log in with your new password.',
  };
};

// ─── Service: Get Current User ───────────────────────────────────────────────

/**
 * Service: Get Current User Profile
 */
const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
};

module.exports = {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
