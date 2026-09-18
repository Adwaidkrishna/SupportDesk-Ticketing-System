import User from '../../models/User.js';
import { comparePassword } from '../../utils/hash.util.js';
import { generateToken } from '../../utils/jwt.util.js';

/**
 * Service: User Login
 */
export const loginUser = async ({ email, password }) => {
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
