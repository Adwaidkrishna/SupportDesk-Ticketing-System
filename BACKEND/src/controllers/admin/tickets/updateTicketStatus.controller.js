import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/tickets/:ticketId/status
 */
export const updateTicketStatus = async (req, res, next) => {
  try {
    const ticketId = req.sanitizedTicketId || req.params.ticketId;
    const status = req.sanitizedStatus || req.body.status;
    const adminId = req.user.userId;

    const result = await adminService.updateTicketStatus(ticketId, status, adminId);

    res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status} successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default updateTicketStatus;
