import ticketService from '../../../services/ticket/index.js';

/**
 * Controller for customer to send a message on a ticket.
 */
const sendCustomerMessage = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    // Customer ID strictly from JWT
    const customerId = req.user.userId || req.user.id;
    const body = req.validatedBody?.body || req.body?.body;

    const message = await ticketService.sendCustomerMessage(ticketId, customerId, body);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export default sendCustomerMessage;
