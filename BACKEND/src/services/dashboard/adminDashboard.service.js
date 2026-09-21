import User from '../../models/User.js';
import Ticket from '../../models/Ticket.js';

/**
 * Service to retrieve system-wide dashboard metrics for an authenticated administrator.
 *
 * Provides:
 * - User counts (total and breakdown by role: customer, agent, admin)
 * - Ticket counts (total and breakdown by status: open, inProgress, resolved, closed)
 * - Ticket counts by priority (LOW, MEDIUM, HIGH, URGENT)
 * - Ticket counts by category (with category name populated)
 * - Agent workload metrics across all registered agents (including agents with 0 assigned tickets)
 * - Recent ticket activity across the system (up to 10 latest tickets)
 *
 * @returns {Promise<Object>} Admin dashboard metrics
 */
export const getAdminDashboard = async () => {
  const [
    userRolesAgg,
    ticketStatusAgg,
    ticketPriorityAgg,
    ticketsByCategoryAgg,
    agentsList,
    agentTicketsAgg,
    recentTicketsRaw,
  ] = await Promise.all([
    // 1. Users grouped by role
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),

    // 2. Tickets grouped by status
    Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // 3. Tickets grouped by priority
    Ticket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),

    // 4. Tickets grouped by category with lookup
    Ticket.aggregate([
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          categoryId: { $toString: '$_id' },
          name: { $ifNull: ['$category.name', 'Uncategorized'] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 5. All registered agents (to guarantee 0-workload agents are included)
    User.find({ role: 'agent' }, 'name email').lean(),

    // 6. Tickets grouped by assigned agent
    Ticket.aggregate([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          totalAssigned: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $in: ['$status', ['OPEN', 'IN_PROGRESS']] }, 1, 0],
            },
          },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0],
            },
          },
          closed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0],
            },
          },
        },
      },
    ]),

    // 7. System-wide recent ticket activity
    Ticket.find()
      .populate('customerId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('categoryId', 'name description')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Format user stats
  const userStats = {
    total: 0,
    customers: 0,
    agents: 0,
    admins: 0,
  };
  for (const item of userRolesAgg) {
    if (item._id === 'customer') userStats.customers = item.count;
    else if (item._id === 'agent') userStats.agents = item.count;
    else if (item._id === 'admin') userStats.admins = item.count;
  }
  userStats.total = userStats.customers + userStats.agents + userStats.admins;

  // Format ticket status stats
  const ticketStats = {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };
  for (const item of ticketStatusAgg) {
    if (item._id === 'OPEN') ticketStats.open = item.count;
    else if (item._id === 'IN_PROGRESS') ticketStats.inProgress = item.count;
    else if (item._id === 'RESOLVED') ticketStats.resolved = item.count;
    else if (item._id === 'CLOSED') ticketStats.closed = item.count;
  }
  ticketStats.total =
    ticketStats.open + ticketStats.inProgress + ticketStats.resolved + ticketStats.closed;

  // Format priority breakdown
  const ticketsByPriority = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };
  for (const item of ticketPriorityAgg) {
    if (item._id && ticketsByPriority.hasOwnProperty(item._id)) {
      ticketsByPriority[item._id] = item.count;
    }
  }

  // Format categories breakdown
  const ticketsByCategory = ticketsByCategoryAgg.map((cat) => ({
    categoryId: cat.categoryId,
    name: cat.name,
    count: cat.count,
  }));

  // Format agent workload (ensures agents with 0 tickets are retained)
  const workloadMap = new Map();
  for (const w of agentTicketsAgg) {
    if (w._id) {
      workloadMap.set(w._id.toString(), w);
    }
  }

  const agentWorkload = agentsList.map((agent) => {
    const w = workloadMap.get(agent._id.toString());
    return {
      agentId: agent._id.toString(),
      name: agent.name,
      email: agent.email,
      active: w ? w.active : 0,
      resolved: w ? w.resolved : 0,
      closed: w ? w.closed : 0,
      totalAssigned: w ? w.totalAssigned : 0,
    };
  });

  // Format recent ticket activity
  const recentTicketActivity = recentTicketsRaw.map((t) => ({
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
    assignedTo: t.assignedTo
      ? {
          id: t.assignedTo._id.toString(),
          _id: t.assignedTo._id.toString(),
          name: t.assignedTo.name,
          email: t.assignedTo.email,
        }
      : null,
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
    userStats,
    ticketStats,
    ticketsByPriority,
    ticketsByCategory,
    agentWorkload,
    recentTicketActivity,
  };
};

export default {
  getAdminDashboard,
};
