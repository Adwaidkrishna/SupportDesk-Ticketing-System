const User = require('../models/User');
const Otp = require('../models/Otp');
const PasswordReset = require('../models/PasswordReset');
const { hashPassword, comparePassword } = require('../utils/hash.util');
const { generateToken } = require('../utils/jwt.util');
const { generateOtp, generateResetToken } = require('../utils/otp.util');
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/mailer.util');

/**
 * Service: Register new user
 */
const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    const err = new Error('Name, email, and password are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();

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
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'customer',
    isVerified: false,
  });

  // Generate & save 6-digit OTP (expires in 10 minutes)
  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.create({
    userId: user._id,
    code: otpCode,
    expiresAt,
  });

  // Send OTP email
  await sendOtpEmail(normalizedEmail, otpCode);

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

  if (!user) {
    const err = new Error('User account not found.');
    err.statusCode = 444;
    throw err;
  }

  if (user.isVerified) {
    return { message: 'Account is already verified. You can log in directly.' };
  }

  // Find active, unexpired OTP matching code
  const activeOtp = await Otp.findOne({
    userId: user._id,
    code: String(otp).trim(),
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

  // Invalidate OTP record
  await Otp.deleteMany({ userId: user._id });

  return {
    message: 'Account verified successfully! You can now log in.',
  };
};

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

  if (!user) {
    const err = new Error('User account not found.');
    err.statusCode = 404;
    throw err;
  }

  if (user.isVerified) {
    const err = new Error('Account is already verified.');
    err.statusCode = 400;
    throw err;
  }

  // Rate limit check: cooldown 60 seconds
  const recentOtp = await Otp.findOne({
    userId: user._id,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });

  if (recentOtp) {
    const err = new Error('Please wait 60 seconds before requesting another OTP.');
    err.statusCode = 429;
    throw err;
  }

  // Delete previous OTPs
  await Otp.deleteMany({ userId: user._id });

  // Generate new OTP
  const newOtp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.create({
    userId: user._id,
    code: newOtp,
    expiresAt,
  });

  await sendOtpEmail(normalizedEmail, newOtp);

  return {
    message: 'New verification OTP sent to your email.',
  };
};

/**
 * Service: User Login
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error('Email and password are required.');
    err.statusCode = 400;
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

  // Generate JWT with minimum identity & role
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

/**
 * Service: Forgot Password
 */
const forgotPassword = async ({ email }) => {
  if (!email) {
    const err = new Error('Email address is required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // Return generic success to prevent email enumeration
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  // Invalidate previous reset tokens
  await PasswordReset.deleteMany({ userId: user._id });

  // Generate token (expires in 15 mins)
  const resetToken = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await PasswordReset.create({
    userId: user._id,
    token: resetToken,
    expiresAt,
    used: false,
  });

  await sendPasswordResetEmail(normalizedEmail, resetToken);

  return {
    message: 'Password reset token sent to your email.',
  };
};

/**
 * Service: Reset Password
 */
const resetPassword = async ({ email, token, newPassword }) => {
  if (!email || !token || !newPassword) {
    const err = new Error('Email, token, and new password are required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const err = new Error('Invalid email or reset token.');
    err.statusCode = 400;
    throw err;
  }

  const resetRecord = await PasswordReset.findOne({
    userId: user._id,
    token: String(token).trim(),
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

  // Mark token used
  resetRecord.used = true;
  await resetRecord.save();

  return {
    message: 'Password reset successfully! You can now log in with your new password.',
  };
};

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
