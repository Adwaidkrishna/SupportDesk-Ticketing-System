const authService = require('../../services/auth.service');

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getMe;
