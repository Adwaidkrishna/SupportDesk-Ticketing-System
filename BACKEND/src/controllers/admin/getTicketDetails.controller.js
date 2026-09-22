import adminService from '../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/tickets/:ticketId
 */
export const getTicketDetails = async (req, res, next) => {
  try {
    const ticketId = req.sanitizedTicketId || req.params.ticketId;
    const result = await adminService.getTicketDetails(ticketId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getTicketDetails;
