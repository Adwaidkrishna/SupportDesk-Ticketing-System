import Ticket from '../../models/Ticket.js';

/**
 * Service to list tickets created strictly by the authenticated customer.
 */
export const getMyTickets = async ({ customerId, page = 1, limit = 10, status }) => {
  // Mandatory customer isolation query
  const query = { customerId };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [rawTickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('categoryId', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Ticket.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const tickets = rawTickets.map((t) => ({
    id: t._id.toString(),
    _id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    category: t.categoryId
      ? {
          id: t.categoryId._id.toString(),
          _id: t.categoryId._id.toString(),
          name: t.categoryId.name,
          description: t.categoryId.description,
        }
      : null,
    categoryId: t.categoryId ? t.categoryId._id.toString() : null,
    priority: t.priority,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
};
