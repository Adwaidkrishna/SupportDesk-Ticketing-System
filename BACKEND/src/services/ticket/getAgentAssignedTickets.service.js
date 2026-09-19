import Ticket from '../../models/Ticket.js';

/**
 * Service to fetch tickets assigned to the authenticated support agent.
 *
 * Enforces:
 * - Filtered strictly by assignedTo = authenticated agent's ObjectId (from JWT).
 * - Optional status filter (e.g. 'OPEN', 'IN_PROGRESS') if provided.
 * - Standard pagination conventions (page, limit, total, totalPages, hasNextPage, hasPreviousPage).
 * - Populates customerId (name, email) and categoryId (name, description).
 * - Exposes safe ticket data without sensitive fields.
 *
 * @param {Object} options
 * @param {string} options.agentId - Authenticated agent's User ObjectId from JWT
 * @param {number} [options.page=1] - Current page number
 * @param {number} [options.limit=10] - Number of tickets per page
 * @param {string} [options.status] - Optional status filter
 * @returns {Promise<Object>} Formatted tickets list and pagination metadata
 */
export const getAgentAssignedTickets = async ({
  agentId,
  page = 1,
  limit = 10,
  status,
} = {}) => {
  if (!agentId) {
    const error = new Error('Agent ID is required');
    error.statusCode = 400;
    throw error;
  }

  const query = {
    assignedTo: agentId,
  };

  if (status) {
    const normalizedStatus = status.toUpperCase();
    if (normalizedStatus !== 'ALL') {
      query.status = normalizedStatus;
    }
    // If status is 'ALL', no status constraint is added, exposing all assigned tickets (IN_PROGRESS, RESOLVED, CLOSED)
  } else {
    // Default active assigned work view: strictly IN_PROGRESS
    query.status = 'IN_PROGRESS';
  }

  const skip = (page - 1) * limit;

  const [rawTickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('customerId', 'name email')
      .populate('categoryId', 'name description')
      .sort({ updatedAt: -1 })
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

export default getAgentAssignedTickets;
