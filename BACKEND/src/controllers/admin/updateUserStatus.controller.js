import adminService from '../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/users/:userId/status
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.validatedBody;

    const user = await adminService.updateUserStatus(userId, isActive);

    res.status(200).json({
      success: true,
      message: `User account successfully ${isActive ? 'activated' : 'deactivated'}.`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export default updateUserStatus;
