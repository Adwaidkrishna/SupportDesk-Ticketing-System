import ticketService from '../../../services/ticket/index.js';

const getTicketMessages = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId || req.user.id;

    const messages = await ticketService.getTicketMessages(userId, ticketId);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

export default getTicketMessages;
