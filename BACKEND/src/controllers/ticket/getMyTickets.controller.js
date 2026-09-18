import ticketService from '../../services/ticket/index.js';

const getMyTickets = async (req, res, next) => {
  try {
    // 1. Get authenticated customer ID strictly from JWT context (ignore any req.query.customerId)
    const customerId = req.user.userId || req.user.id;

    // 2. Extract validated query params
    const { page, limit, status } = req.validatedQuery || {};

    // 3. Invoke Ticket Service
    const result = await ticketService.getMyTickets({
      customerId,
      page: page || 1,
      limit: limit || 10,
      status,
    });

    // 4. Return 200 OK
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default getMyTickets;
