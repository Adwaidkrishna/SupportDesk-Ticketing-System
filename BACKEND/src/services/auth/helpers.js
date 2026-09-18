import crypto from 'crypto';

/**
 * One-way SHA-256 hash for OTPs and password-reset tokens.
 * Raw values are NEVER stored in the database.
 * Comparison is done by hashing the submitted value and comparing hashes.
 */
export const sha256 = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

/**
 * Server-side password validation.
 */
export const validatePasswordStrength = (password) => {
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
