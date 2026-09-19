import ticketService from '../../services/ticket/index.js';

/**
 * Controller to claim an unassigned OPEN ticket for the authenticated agent.
 */
const claimTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    // Agent identity strictly from authenticated JWT context (never trust body, query, headers)
    const agentId = req.user.userId || req.user.id;

    const result = await ticketService.claimTicket(ticketId, agentId);

    res.status(200).json({
      success: true,
      message: 'Ticket claimed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default claimTicket;
