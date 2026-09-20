import ticketService from '../../../services/ticket/index.js';

/**
 * Controller for assigned agent to retrieve ticket conversation messages.
 */
const getAgentTicketMessages = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const agentId = req.user.userId || req.user.id;

    const messages = await ticketService.getAgentTicketMessages(ticketId, agentId);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

export default getAgentTicketMessages;
