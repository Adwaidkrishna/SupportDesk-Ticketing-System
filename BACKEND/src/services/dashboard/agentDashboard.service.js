import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.js';

/**
 * Service to retrieve dashboard statistics and workload data for an authenticated agent.
 *
 * Enforces:
 * - Available queue: Unassigned OPEN tickets (system-wide available to claim).
 * - Agent workload: Strictly isolated to tickets assigned to this agent (assignedTo = agentId).
 * - myActiveTickets = OPEN + IN_PROGRESS
 * - Historical counts: RESOLVED, CLOSED
 * - High/urgent count: Active tickets assigned to agent with priority in ['HIGH', 'URGENT']
 *
 * @param {string|mongoose.Types.ObjectId} agentId
 * @returns {Promise<Object>} Agent dashboard metrics
 */
export const getAgentDashboard = async (agentId) => {
  if (!agentId) {
    const error = new Error('Agent ID is required');
    error.statusCode = 400;
    throw error;
  }

  const agentObjId = new mongoose.Types.ObjectId(agentId);

  const [
    availableTicketsCount,
    agentStatusAgg,
    myHighUrgentTicketsCount,
    recentAssignedTicketsRaw,
  ] = await Promise.all([
    // 1. Available unassigned tickets in queue
    Ticket.countDocuments({
      status: 'OPEN',
      $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
    }),

    // 2. Status distribution for tickets assigned to this agent
    Ticket.aggregate([
      { $match: { assignedTo: agentObjId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // 3. Active tickets with HIGH or URGENT priority assigned to this agent
    Ticket.countDocuments({
      assignedTo: agentObjId,
      priority: { $in: ['HIGH', 'URGENT'] },
      status: { $in: ['OPEN', 'IN_PROGRESS'] },
    }),

    // 4. Most recently updated tickets assigned to this agent
    Ticket.find({ assignedTo: agentObjId })
      .populate('customerId', 'name email')
      .populate('categoryId', 'name description')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
  ]);

  let openCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;
  let closedCount = 0;

  for (const item of agentStatusAgg) {
    if (item._id === 'OPEN') openCount = item.count;
    else if (item._id === 'IN_PROGRESS') inProgressCount = item.count;
    else if (item._id === 'RESOLVED') resolvedCount = item.count;
    else if (item._id === 'CLOSED') closedCount = item.count;
  }

  const myActiveTickets = openCount + inProgressCount;
  const myResolvedTickets = resolvedCount;
  const myClosedTickets = closedCount;
  const totalAssigned = myActiveTickets + myResolvedTickets + myClosedTickets;

  const recentAssignedTickets = recentAssignedTicketsRaw.map((t) => ({
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
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  const workload = {
    totalAssigned,
    activeTickets: myActiveTickets,
    resolvedTickets: myResolvedTickets,
    closedTickets: myClosedTickets,
    highUrgentTickets: myHighUrgentTicketsCount,
  };

  const stats = {
    availableTickets: availableTicketsCount,
    myActiveTickets,
    myResolvedTickets,
    myClosedTickets,
    myHighUrgentTickets: myHighUrgentTicketsCount,
  };

  return {
    stats,
    workload,
    recentAssignedTickets,
  };
};

export default {
  getAgentDashboard,
};
