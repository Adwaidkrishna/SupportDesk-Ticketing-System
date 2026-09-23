import mongoose from 'mongoose';
import User from '../../../models/User.js';
import Ticket from '../../../models/Ticket.js';

/**
 * Service to fetch all support agents with filtering, search, live ticket workload, and KPI statistics.
 *
 * @param {Object} params - Query parameters: { search, status }
 * @returns {Promise<{ agents: Array, stats: Object }>}
 */
export const getAgents = async ({ search, status } = {}) => {
  const query = { role: 'agent' };

  // 1. Search by name, email, department, or exact ObjectId
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim();
    const orConditions = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { department: { $regex: term, $options: 'i' } },
    ];
    if (mongoose.Types.ObjectId.isValid(term)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(term) });
    }
    query.$and = [{ $or: orConditions }];
  }

  // 2. Filter by availability status ('Available', 'Busy', 'Away', 'Offline')
  if (status && typeof status === 'string' && status !== 'all') {
    query.availability = status;
  }

  // Execute database queries concurrently
  const [
    rawAgents,
    agentTicketsAgg,
    totalAgents,
    availableAgents,
    busyAgents,
    awayAgents,
    offlineAgents,
  ] = await Promise.all([
    // Filtered agents sorted by creation date
    User.find(query).sort({ createdAt: -1 }).lean(),

    // Real workload statistics aggregated from the Ticket collection
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
          inProgress: {
            $sum: {
              $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0],
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

    // Live KPI counts across all agents in the system
    User.countDocuments({ role: 'agent' }),
    User.countDocuments({ role: 'agent', availability: 'Available' }),
    User.countDocuments({ role: 'agent', availability: 'Busy' }),
    User.countDocuments({ role: 'agent', availability: 'Away' }),
    User.countDocuments({ role: 'agent', availability: 'Offline' }),
  ]);

  // Index workload by agentId
  const workloadMap = new Map();
  for (const w of agentTicketsAgg) {
    if (w._id) {
      workloadMap.set(w._id.toString(), w);
    }
  }

  // Format safe agent objects for the frontend
  const agents = rawAgents.map((a) => {
    const w = workloadMap.get(a._id.toString()) || {
      totalAssigned: 0,
      active: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    };

    const slaCompliance =
      w.totalAssigned > 0
        ? `${Math.round(((w.resolved + w.closed) / w.totalAssigned) * 100)}%`
        : '100%';

    return {
      id: a._id.toString(),
      _id: a._id.toString(),
      name: a.name,
      email: a.email,
      department: a.department || 'General Support',
      role: a.role,
      status: a.availability || 'Available',
      availability: a.availability || 'Available',
      isActive: a.isActive !== false,
      assigned: w.active,
      inProgress: w.inProgress,
      resolved: w.resolved,
      closed: w.closed,
      totalAssigned: w.totalAssigned,
      sla: slaCompliance,
      joinedDate: a.createdAt
        ? new Date(a.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Unknown',
    };
  });

  return {
    agents,
    stats: {
      total: totalAgents,
      available: availableAgents,
      busy: busyAgents,
      away: awayAgents,
      offline: offlineAgents,
      awayOffline: awayAgents + offlineAgents,
    },
  };
};

export default getAgents;
