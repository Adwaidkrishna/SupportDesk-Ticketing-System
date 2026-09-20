import ticketService from '../../../services/ticket/index.js';

/**
 * Controller for assigned agent to reply on a ticket.
 */
const sendAgentMessage = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    // Agent ID strictly from JWT
    const agentId = req.user.userId || req.user.id;
    const body = req.validatedBody?.body || req.body?.body;

    const message = await ticketService.sendAgentMessage(ticketId, agentId, body);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export default sendAgentMessage;
