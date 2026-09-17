import api from '../../../services/api';

/**
 * Authentication API Service.
 * Interfaces with backend endpoints at /api/v1/auth/*.
 */

/**
 * Register a new customer account.
 * @param {Object} data - { name, email, password }
 * @returns {Promise<{ success: boolean, message: string, user: Object }>}
 */
export async function register({ name, email, password }) {
  return api.post('/auth/register', { name, email, password });
}

/**
 * Verify account OTP.
 * @param {Object} data - { email, otp }
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function verifyOtp({ email, otp }) {
  return api.post('/auth/verify-otp', { email, otp });
}

/**
 * Resend OTP code to user's email.
 * @param {string} email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function resendOtp(email) {
  return api.post('/auth/resend-otp', { email });
}

/**
 * Sign in with email and password.
 * @param {Object} credentials - { email, password }
 * @returns {Promise<{ success: boolean, message: string, token: string, user: Object }>}
 */
export async function login({ email, password }) {
  return api.post('/auth/login', { email, password });
}

/**
 * Request password reset token via email.
 * @param {string} email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email });
}

/**
 * Reset password using token sent to email.
 * @param {Object} data - { email, token, newPassword }
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function resetPassword({ email, token, newPassword }) {
  return api.post('/auth/reset-password', { email, token, newPassword });
}

/**
 * Retrieve authenticated user profile based on stored JWT.
 * @returns {Promise<{ success: boolean, user: Object }>}
 */
export async function getCurrentUser() {
  return api.get('/auth/me');
}

export default {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
