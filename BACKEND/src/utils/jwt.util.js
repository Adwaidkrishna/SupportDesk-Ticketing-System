const jwt = require('jsonwebtoken');

// Fail fast at startup if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET environment variable is not set. ' +
    'The application cannot start without a cryptographically secure secret. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_ALGORITHM = 'HS256';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: JWT_ALGORITHM,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
  });
};

module.exports = {
  generateToken,
  verifyToken,
};
