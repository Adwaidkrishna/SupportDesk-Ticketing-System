import adminService from '../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/users/:userId
 */
export const updateUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updateData = req.validatedBody;

    const user = await adminService.updateUserDetails(userId, updateData);

    res.status(200).json({
      success: true,
      message: 'User details successfully updated.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export default updateUserDetails;
