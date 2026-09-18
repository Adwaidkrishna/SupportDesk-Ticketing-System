import ticketService from '../../services/ticket.service.js';

const getTicketDetails = async (req, res, next) => {
  try {
    // 1. Read ticketId from path param
    const { ticketId } = req.params;

    // 2. Read customer identity strictly from authenticated JWT context (never trust query/body/headers)
    const customerId = req.user.userId || req.user.id;

    // 3. Invoke Ticket Service (Customer Isolation & IDOR Protection)
    const result = await ticketService.getTicketByIdForCustomer(ticketId, customerId);

    // 4. Return 200 OK
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getTicketDetails;
