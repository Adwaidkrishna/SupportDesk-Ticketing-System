import User from '../../models/User.js';
import PasswordReset from '../../models/PasswordReset.js';
import { generateResetToken } from '../../utils/otp.util.js';
import { sendPasswordResetEmail } from '../../utils/mailer.util.js';
import { sha256 } from './helpers.js';

const FORGOT_PASSWORD_MESSAGE =
  'If an account with that email exists, a password reset link has been sent.';

/**
 * Service: Forgot Password
 * Always returns the same generic message regardless of account existence.
 */
export const forgotPassword = async ({ email }) => {
  if (!email) {
    const err = new Error('Email address is required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Return IDENTICAL message regardless of user existence
  if (!user) {
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  // Invalidate previous reset tokens
  await PasswordReset.deleteMany({ userId: user._id });

  // Generate raw reset token (expires in 15 mins)
  const resetToken = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Store SHA-256 hash of token — NEVER the raw token
  const tokenHash = sha256(resetToken);
  await PasswordReset.create({
    userId: user._id,
    token: tokenHash,
    expiresAt,
    used: false,
  });

  // Surface delivery failure (but keep message generic to user)
  try {
    await sendPasswordResetEmail(normalizedEmail, resetToken);
  } catch (mailErr) {
    await PasswordReset.deleteMany({ userId: user._id });
    console.error('[Auth] Password reset email delivery failed:', mailErr.message);
    // Even on failure, return same generic message (don't reveal existence)
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  // Return IDENTICAL message for both found and not-found
  return { message: FORGOT_PASSWORD_MESSAGE };
};
