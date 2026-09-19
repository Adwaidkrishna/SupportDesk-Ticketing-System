import ticketService from '../../services/ticket/index.js';

/**
 * Controller to update an assigned ticket's status to RESOLVED or CLOSED by the assigned agent.
 *
 * Security:
 * - Uses req.user.userId directly from verified JWT context.
 * - Validated status from req.validatedBody.
 */
const updateAgentTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.validatedBody;
    const agentId = req.user.userId;

    const ticket = await ticketService.updateAgentTicketStatus(ticketId, agentId, status);

    res.status(200).json({
      success: true,
      message: `Ticket status successfully updated to ${status}.`,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

export default updateAgentTicketStatus;
