import Ticket from '../../models/Ticket.js';

/**
 * Service to retrieve single ticket details strictly owned by the authenticated customer.
 */
export const getTicketByIdForCustomer = async (ticketId, customerId) => {
  // Scoped query: ticketId AND customerId (Customer Isolation & IDOR Protection)
  const ticket = await Ticket.findOne({
    _id: ticketId,
    customerId,
  })
    .populate('categoryId', 'name description')
    .lean();

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    ticket: {
      id: ticket._id.toString(),
      _id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.categoryId
        ? {
            id: ticket.categoryId._id.toString(),
            _id: ticket.categoryId._id.toString(),
            name: ticket.categoryId.name,
            description: ticket.categoryId.description,
          }
        : null,
      categoryId: ticket.categoryId ? ticket.categoryId._id.toString() : null,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  };
};
