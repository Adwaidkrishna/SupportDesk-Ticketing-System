const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticateUser } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/rbac.middleware');
const {
  loginLimiter,
  registerLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require('../middleware/rate-limit.middleware');

// Public Authentication Endpoints — each protected by a per-endpoint rate limiter
router.post('/register',         registerLimiter,       authController.register);
router.post('/verify-otp',       verifyOtpLimiter,      authController.verifyOtp);
router.post('/resend-otp',       resendOtpLimiter,      authController.resendOtp);
router.post('/login',            loginLimiter,          authController.login);
router.post('/forgot-password',  forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password',   resetPasswordLimiter,  authController.resetPassword);

// Protected Authentication Endpoints
router.get('/me', authenticateUser, authController.getMe);

// RBAC Protected Test Endpoints
router.get('/customer-protected', authenticateUser, authorizeRoles('customer'), (req, res) => {
  res.status(200).json({ success: true, message: 'Access granted to customer-protected endpoint' });
});
router.get('/agent-protected', authenticateUser, authorizeRoles('agent'), (req, res) => {
  res.status(200).json({ success: true, message: 'Access granted to agent-protected endpoint' });
});
router.get('/admin-protected', authenticateUser, authorizeRoles('admin'), (req, res) => {
  res.status(200).json({ success: true, message: 'Access granted to admin-protected endpoint' });
});

module.exports = router;
