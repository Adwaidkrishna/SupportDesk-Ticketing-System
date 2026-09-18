import { registerUser } from './register.service.js';
import { verifyOtp } from './verifyOtp.service.js';
import { resendOtp } from './resendOtp.service.js';
import { loginUser } from './login.service.js';
import { forgotPassword } from './forgotPassword.service.js';
import { resetPassword } from './resetPassword.service.js';
import { getCurrentUser } from './getMe.service.js';

export {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};

export default {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
