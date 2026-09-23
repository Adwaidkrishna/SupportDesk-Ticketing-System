import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const result = await adminService.getCategories();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getCategories;
