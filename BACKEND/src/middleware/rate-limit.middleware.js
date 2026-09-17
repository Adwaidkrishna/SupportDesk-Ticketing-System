const rateLimit = require('express-rate-limit');

/**
 * Rate Limit Middleware Factory
 * H-01, H-02, H-03 FIX: Per-endpoint rate limits for all auth routes.
 *
 * Limits are intentionally differentiated by threat level.
 * Note: For production with multiple server instances, use a shared store
 * (e.g., Redis with rate-limit-redis) instead of in-memory.
 */

const rateLimitMessage = (action) => ({
  success: false,
  message: `Too many ${action} attempts. Please try again later.`,
});

// ─── Login ───────────────────────────────────────────────────────────────────
// Brute-force + credential stuffing protection
// 10 attempts per 15-minute window per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('login'),
  skipSuccessfulRequests: false,
});

// ─── Registration ────────────────────────────────────────────────────────────
// Spam / SMTP quota exhaustion protection
// 5 registrations per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('registration'),
});

// ─── OTP Verification ────────────────────────────────────────────────────────
// OTP brute-force protection (6-digit = 1M combos)
// 10 attempts per 5-minute window per IP
const verifyOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,    // 5 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('OTP verification'),
});

// ─── Resend OTP ──────────────────────────────────────────────────────────────
// Prevents OTP resend abuse (supplements the per-user 60-second cooldown)
// 5 resend requests per 10-minute window per IP
const resendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('OTP resend'),
});

// ─── Forgot Password ─────────────────────────────────────────────────────────
// Email spam + SMTP abuse protection
// 5 requests per 15-minute window per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('password reset'),
});

// ─── Reset Password ──────────────────────────────────────────────────────────
// Protects against token enumeration via brute-force
// 10 attempts per 15-minute window per IP
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('password reset'),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
};
