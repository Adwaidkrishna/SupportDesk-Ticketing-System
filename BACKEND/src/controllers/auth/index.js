const register = require('./register.controller');
const verifyOtp = require('./verifyOtp.controller');
const resendOtp = require('./resendOtp.controller');
const login = require('./login.controller');
const forgotPassword = require('./forgotPassword.controller');
const resetPassword = require('./resetPassword.controller');
const getMe = require('./getMe.controller');

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};
