import Ticket from '../../../models/Ticket.js';
import User from '../../../models/User.js';

/**
 * Service to retrieve paginated tickets with filtering and search for admin management.
 *
 * @param {Object} queryParams
 * @param {number} queryParams.page
 * @param {number} queryParams.limit
 * @param {string} [queryParams.search]
 * @param {string} [queryParams.status]
 * @param {string} [queryParams.priority]
 * @param {string} [queryParams.categoryId]
 * @param {string} [queryParams.agentId]
 * @returns {Promise<Object>} Formatted tickets list, pagination info, and stats
 */
export const getTickets = async (queryParams) => {
  const { page = 1, limit = 20, search, status, priority, categoryId, agentId } = queryParams;

  const matchConditions = [];

  if (status) {
    matchConditions.push({ status });
  }

  if (priority) {
    matchConditions.push({ priority });
  }

  if (categoryId) {
    matchConditions.push({ categoryId });
  }

  if (agentId) {
    if (agentId.toLowerCase() === 'unassigned') {
      matchConditions.push({
        $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
      });
    } else {
      matchConditions.push({ assignedTo: agentId });
    }
  }

  if (search && search.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');

    // Find customers whose name or email matches search
    const matchingCustomers = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }],
    })
      .select('_id')
      .lean();

    const customerIds = matchingCustomers.map((c) => c._id);

    const searchOrConditions = [
      { ticketNumber: searchRegex },
      { subject: searchRegex },
    ];

    if (customerIds.length > 0) {
      searchOrConditions.push({ customerId: { $in: customerIds } });
    }

    matchConditions.push({ $or: searchOrConditions });
  }

  const finalQuery = matchConditions.length > 0 ? { $and: matchConditions } : {};

  const skip = (page - 1) * limit;

  const [rawTickets, totalMatching, totalOpen, totalInProgress, totalResolved, totalClosed, totalAll] =
    await Promise.all([
      Ticket.find(finalQuery)
        .populate('customerId', 'name email avatar phone')
        .populate('assignedTo', 'name email department availability')
        .populate('categoryId', 'name description')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(finalQuery),
      Ticket.countDocuments({ status: 'OPEN' }),
      Ticket.countDocuments({ status: 'IN_PROGRESS' }),
      Ticket.countDocuments({ status: 'RESOLVED' }),
      Ticket.countDocuments({ status: 'CLOSED' }),
      Ticket.countDocuments({}),
    ]);

  const tickets = rawTickets.map((t) => ({
    id: t._id.toString(),
    _id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    customer: t.customerId
      ? {
          id: t.customerId._id.toString(),
          _id: t.customerId._id.toString(),
          name: t.customerId.name,
          email: t.customerId.email,
          phone: t.customerId.phone,
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
    assignedTo: t.assignedTo
      ? {
          id: t.assignedTo._id.toString(),
          _id: t.assignedTo._id.toString(),
          name: t.assignedTo.name,
          email: t.assignedTo.email,
          department: t.assignedTo.department,
          availability: t.assignedTo.availability,
        }
      : null,
    agent: t.assignedTo ? t.assignedTo.name : 'Unassigned',
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  const totalPages = Math.ceil(totalMatching / limit) || 1;

  return {
    tickets,
    pagination: {
      page,
      limit,
      total: totalMatching,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    stats: {
      total: totalAll,
      open: totalOpen,
      inProgress: totalInProgress,
      resolved: totalResolved,
      closed: totalClosed,
    },
  };
};

export default getTickets;
