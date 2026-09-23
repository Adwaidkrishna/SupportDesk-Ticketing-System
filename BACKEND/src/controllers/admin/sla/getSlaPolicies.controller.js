import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/sla/policies
 */
export const getSlaPolicies = async (req, res, next) => {
  try {
    const result = await adminService.getSlaPolicies();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getSlaPolicies;
