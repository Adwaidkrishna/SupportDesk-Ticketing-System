import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle POST /api/v1/admin/categories
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.validatedBody;
    const category = await adminService.createCategory({ name, description, isActive });

    res.status(201).json({
      success: true,
      message: `Category "${category.name}" created successfully.`,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

export default createCategory;
