import authService from '../../services/auth/index.js';

const resendOtp = async (req, res, next) => {
  try {
    const result = await authService.resendOtp(req.body.email);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export default resendOtp;
