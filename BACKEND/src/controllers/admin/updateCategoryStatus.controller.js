import adminService from '../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/categories/:categoryId/status
 */
export const updateCategoryStatus = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { isActive } = req.validatedBody;

    const category = await adminService.updateCategoryStatus(categoryId, isActive);

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" has been ${isActive ? 'activated' : 'deactivated'}.`,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

export default updateCategoryStatus;
