import adminService from '../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/users
 */
export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const result = await adminService.getUsers({ search, role, status });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getUsers;
