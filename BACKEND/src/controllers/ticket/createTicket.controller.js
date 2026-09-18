import ticketService from '../../services/ticket.service.js';

const createTicket = async (req, res, next) => {
  try {
    // 1. Get authenticated customer ID from JWT context (never trust req.body.customerId)
    const customerId = req.user.userId || req.user.id;

    // 2. Extract strictly permitted fields (prevent mass assignment)
    const { subject, description, categoryId, priority } = req.validatedData || req.body;

    // 3. Invoke Ticket Service
    const result = await ticketService.createTicket({
      customerId,
      subject,
      description,
      categoryId,
      priority,
    });

    // 4. Return 201 Created
    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default createTicket;
