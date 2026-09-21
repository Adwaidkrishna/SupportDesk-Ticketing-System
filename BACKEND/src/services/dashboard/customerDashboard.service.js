import mongoose from 'mongoose';
import Ticket from '../../models/Ticket.js';
import Notification from '../../models/Notification.js';

/**
 * Service to retrieve dashboard statistics and recent data for an authenticated customer.
 * Strict customer isolation is applied via customerId.
 *
 * @param {string|mongoose.Types.ObjectId} customerId
 * @returns {Promise<Object>} Customer dashboard metrics
 */
export const getCustomerDashboard = async (customerId) => {
  if (!customerId) {
    const error = new Error('Customer ID is required');
    error.statusCode = 400;
    throw error;
  }

  const customerObjId = new mongoose.Types.ObjectId(customerId);

  const [statusAgg, recentTicketsRaw, recentNotifsRaw, unreadNotifCount] = await Promise.all([
    Ticket.aggregate([
      { $match: { customerId: customerObjId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Ticket.find({ customerId: customerObjId })
      .populate('categoryId', 'name description')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Notification.find({ recipient: customerObjId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'name email role')
      .lean(),
    Notification.countDocuments({
      recipient: customerObjId,
      read: false,
    }),
  ]);

  const stats = {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };

  for (const item of statusAgg) {
    if (item._id === 'OPEN') stats.open = item.count;
    else if (item._id === 'IN_PROGRESS') stats.inProgress = item.count;
    else if (item._id === 'RESOLVED') stats.resolved = item.count;
    else if (item._id === 'CLOSED') stats.closed = item.count;
  }
  stats.total = stats.open + stats.inProgress + stats.resolved + stats.closed;

  const recentTickets = recentTicketsRaw.map((t) => ({
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

  const recentNotifications = recentNotifsRaw.map((n) => ({
    id: n._id.toString(),
    _id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    ticketId: n.ticketId ? n.ticketId.toString() : null,
    ticketNumber: n.ticketNumber,
    targetRoute: n.targetRoute,
    read: n.read,
    readAt: n.readAt,
    sender: n.sender
      ? {
          id: n.sender._id.toString(),
          _id: n.sender._id.toString(),
          name: n.sender.name,
          email: n.sender.email,
          role: n.sender.role,
        }
      : null,
    createdAt: n.createdAt,
  }));

  return {
    stats,
    recentTickets,
    notifications: {
      unreadCount: unreadNotifCount,
      recent: recentNotifications,
    },
  };
};

export default {
  getCustomerDashboard,
};
