import mongoose from 'mongoose';
import User from '../../../models/User.js';
import Ticket from '../../../models/Ticket.js';

/**
 * Service to fetch all users with filtering, search, ticket counts, and KPI statistics.
 *
 * @param {Object} params - Query parameters: { search, role, status }
 * @returns {Promise<{ users: Array, stats: Object }>}
 */
export const getUsers = async ({ search, role, status } = {}) => {
  const query = {};

  // 1. Search by name, email, or exact ObjectId
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim();
    const orConditions = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ];
    if (mongoose.Types.ObjectId.isValid(term)) {
      orConditions.push({ _id: new mongoose.Types.ObjectId(term) });
    }
    query.$or = orConditions;
  }

  // 2. Filter by role ('customer', 'agent', 'admin')
  if (role && typeof role === 'string' && role !== 'all') {
    const normalizedRole = role.toLowerCase().trim();
    if (['customer', 'agent', 'admin'].includes(normalizedRole)) {
      query.role = normalizedRole;
    }
  }

  // 3. Filter by status ('active', 'inactive')
  if (status && typeof status === 'string' && status !== 'all') {
    const normalizedStatus = status.toLowerCase().trim();
    if (normalizedStatus === 'active') {
      query.isActive = { $ne: false };
    } else if (normalizedStatus === 'inactive') {
      query.isActive = false;
    }
  }

  // Calculate start of current month for new user registration metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Execute database queries concurrently
  const [rawUsers, ticketCountsAgg, totalUsers, activeUsers, inactiveUsers, newThisMonth] =
    await Promise.all([
      // Filtered users sorted newest first
      User.find(query).sort({ createdAt: -1 }).lean(),

      // Aggregate ticket counts grouped by customerId
      Ticket.aggregate([
        {
          $group: {
            _id: '$customerId',
            total: { $sum: 1 },
            open: {
              $sum: {
                $cond: [{ $in: ['$status', ['OPEN', 'IN_PROGRESS']] }, 1, 0],
              },
            },
          },
        },
      ]),

      // System-wide KPI counts (independent of current table filters)
      User.countDocuments(),
      User.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

  // Index ticket counts in a hash map for fast O(1) lookup
  const ticketCountMap = new Map();
  for (const item of ticketCountsAgg) {
    if (item._id) {
      ticketCountMap.set(item._id.toString(), {
        total: item.total || 0,
        open: item.open || 0,
      });
    }
  }

  // Format safe user list for the frontend
  const users = rawUsers.map((u) => {
    const tStats = ticketCountMap.get(u._id.toString()) || { total: 0, open: 0 };
    const isActive = u.isActive !== false;

    return {
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isActive,
      status: isActive ? 'Active' : 'Inactive',
      phone: u.phone || '',
      department: u.department || 'General Support',
      ticketsCount: tStats.total,
      openTickets: tStats.open,
      isVerified: Boolean(u.isVerified),
      createdAt: u.createdAt,
      joinedDate: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Unknown',
      lastActive: u.updatedAt
        ? new Date(u.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Unknown',
    };
  });

  return {
    users,
    stats: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      newThisMonth,
    },
  };
};

export default getUsers;
