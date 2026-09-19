import ticketService from '../../services/ticket/index.js';

/**
 * Controller to retrieve tickets assigned to the authenticated support agent.
 *
 * Security:
 * - Uses req.user.userId directly from the verified JWT context.
 * - Ignores any client-supplied user or agent ID parameters.
 */
const getAgentAssignedTickets = async (req, res, next) => {
  try {
    const { page, limit } = req.validatedQuery || {};
    const agentId = req.user.userId;
    const status = req.query.status;

    const result = await ticketService.getAgentAssignedTickets({
      agentId,
      page: page || 1,
      limit: limit || 10,
      status,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getAgentAssignedTickets;
