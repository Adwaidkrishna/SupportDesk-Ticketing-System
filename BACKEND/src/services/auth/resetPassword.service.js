import User from '../../models/User.js';
import PasswordReset from '../../models/PasswordReset.js';
import { hashPassword } from '../../utils/hash.util.js';
import { sha256, validatePasswordStrength } from './helpers.js';

/**
 * Service: Reset Password
 */
export const resetPassword = async ({ email, token, newPassword }) => {
  if (!email || !token || !newPassword) {
    const err = new Error('Email, token, and new password are required.');
    err.statusCode = 400;
    throw err;
  }

  // Server-side password validation on reset too
  validatePasswordStrength(newPassword);

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const err = new Error('Invalid email or reset token.');
    err.statusCode = 400;
    throw err;
  }

  // Hash submitted token and compare against stored hash
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
