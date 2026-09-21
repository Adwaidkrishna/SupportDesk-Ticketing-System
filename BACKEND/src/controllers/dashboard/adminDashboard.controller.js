import dashboardService from '../../services/dashboard/index.js';

/**
 * Controller to retrieve system-wide admin dashboard data for an authenticated admin.
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const result = await dashboardService.getAdminDashboard();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getAdminDashboard;
