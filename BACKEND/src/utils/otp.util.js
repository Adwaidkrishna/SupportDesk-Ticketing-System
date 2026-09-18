import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export const generateOtp = () => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += digits[crypto.randomInt(0, 10)];
  }
  return otp;
};

/**
 * Generates a secure random token for password reset
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
