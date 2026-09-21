import dashboardService from '../../services/dashboard/index.js';

/**
 * Controller to retrieve customer dashboard data for the authenticated customer.
 */
const getCustomerDashboard = async (req, res, next) => {
  try {
    const customerId = req.user.userId || req.user.id;
    const result = await dashboardService.getCustomerDashboard(customerId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getCustomerDashboard;
