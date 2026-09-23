import adminService from '../../../services/admin/index.js';

/**
 * Controller to handle PATCH /api/v1/admin/tickets/:ticketId/priority
 */
export const updateTicketPriority = async (req, res, next) => {
  try {
    const ticketId = req.sanitizedTicketId || req.params.ticketId;
    const priority = req.sanitizedPriority || req.body.priority;

    const result = await adminService.updateTicketPriority(ticketId, priority);

    res.status(200).json({
      success: true,
      message: `Ticket priority updated to ${priority} successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default updateTicketPriority;
