import dashboardService from '../../services/dashboard/index.js';

/**
 * Controller to retrieve agent dashboard data for the authenticated agent.
 */
const getAgentDashboard = async (req, res, next) => {
  try {
    const agentId = req.user.userId || req.user.id;
    const result = await dashboardService.getAgentDashboard(agentId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getAgentDashboard;
