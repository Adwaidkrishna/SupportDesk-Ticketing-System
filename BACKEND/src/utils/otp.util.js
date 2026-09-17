const crypto = require('crypto');

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
const generateOtp = () => {
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
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  generateOtp,
  generateResetToken,
};
