import adminService from '../../services/admin/index.js';

/**
 * Controller to handle POST /api/v1/admin/tickets/:ticketId/messages
 */
export const sendAdminReply = async (req, res, next) => {
  try {
    const ticketId = req.sanitizedTicketId || req.params.ticketId;
    const body = req.sanitizedBody || req.body.body;
    const adminId = req.user.userId;

    const message = await adminService.sendAdminReply(ticketId, adminId, body);

    res.status(201).json({
      success: true,
      message: 'Official admin reply posted successfully.',
      data: {
        message,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default sendAdminReply;
