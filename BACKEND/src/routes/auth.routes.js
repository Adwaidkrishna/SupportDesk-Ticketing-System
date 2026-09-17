const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticateUser } = require('../middleware/auth.middleware');

// Public Authentication Endpoints
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected Authentication Endpoints
router.get('/me', authenticateUser, authController.getMe);

module.exports = router;
