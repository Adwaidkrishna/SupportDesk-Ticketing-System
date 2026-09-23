import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/tickets
 */
export const getTickets = async (req, res, next) => {
  try {
    const queryParams = req.validatedQuery || req.query;
    const result = await adminService.getTickets(queryParams);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getTickets;
