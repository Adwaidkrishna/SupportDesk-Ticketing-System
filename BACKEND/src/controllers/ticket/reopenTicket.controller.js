import ticketService from '../../services/ticket/index.js';

/**
 * Controller to reopen a RESOLVED ticket back to IN_PROGRESS.
 *
 * Security:
 * - Uses req.user.userId and req.user.role directly from verified JWT context.
 */
const reopenTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { userId, role } = req.user;

    const ticket = await ticketService.reopenTicket(ticketId, userId, role);

    res.status(200).json({
      success: true,
      message: 'Ticket successfully reopened.',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

export default reopenTicket;
