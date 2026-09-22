import adminService from '../../services/admin/index.js';

/**
 * Controller to handle GET /api/v1/admin/tickets/:ticketId/messages
 */
export const getTicketMessages = async (req, res, next) => {
  try {
    const ticketId = req.sanitizedTicketId || req.params.ticketId;

    const messages = await adminService.getTicketMessages(ticketId);

    res.status(200).json({
      success: true,
      data: {
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default getTicketMessages;
