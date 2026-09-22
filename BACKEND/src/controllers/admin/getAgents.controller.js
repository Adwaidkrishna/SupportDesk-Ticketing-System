import adminService from '../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/agents
 */
export const getAgents = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const result = await adminService.getAgents({ search, status });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getAgents;
