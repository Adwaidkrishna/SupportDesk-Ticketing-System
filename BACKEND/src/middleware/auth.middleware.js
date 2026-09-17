const { verifyToken } = require('../utils/jwt.util');

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: No bearer token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Attaches { userId, role }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Invalid or expired token.',
    });
  }
};

module.exports = {
  authenticateUser,
};
