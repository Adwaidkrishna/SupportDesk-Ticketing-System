const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'supportdesk_super_secret_jwt_key_2026_dev',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || 'supportdesk_super_secret_jwt_key_2026_dev'
  );
};

module.exports = {
  generateToken,
  verifyToken,
};
