import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle PUT /api/v1/admin/categories/:categoryId
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updateData = req.validatedBody;

    const category = await adminService.updateCategory(categoryId, updateData);

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" updated successfully.`,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

export default updateCategory;
