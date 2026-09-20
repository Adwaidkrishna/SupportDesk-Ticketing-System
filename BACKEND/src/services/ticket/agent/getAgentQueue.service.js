import Ticket from '../../../models/Ticket.js';

/**
  * Service to fetch unassigned OPEN tickets available in the Agent Queue.
  */
export const getAgentQueue = async ({ page = 1, limit = 10 } = {}) => {
  // Query for available tickets: OPEN status and unassigned
  const query = {
    status: 'OPEN',
    $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
  };

  const skip = (page - 1) * limit;

  const [rawTickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('customerId', 'name email')
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
    description: t.description,
    customer: t.customerId
      ? {
          id: t.customerId._id.toString(),
          _id: t.customerId._id.toString(),
          name: t.customerId.name,
          email: t.customerId.email,
        }
      : null,
    customerId: t.customerId ? t.customerId._id.toString() : null,
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
    assignedTo: t.assignedTo ? t.assignedTo.toString() : null,
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

export default getAgentQueue;
