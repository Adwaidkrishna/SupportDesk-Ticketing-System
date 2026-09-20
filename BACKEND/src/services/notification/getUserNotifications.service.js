import Notification from '../../models/Notification.js';
import getUnreadCount from './getUnreadCount.service.js';

/**
 * Retrieve paginated notifications for a user with optional read status filter.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {Object} [options]
 * @param {boolean|string} [options.read] - Filter by read status ('true', 'false', boolean)
 * @param {number|string} [options.limit=20]
 * @param {number|string} [options.page=1]
 * @returns {Promise<Object>} Notifications list and pagination metadata
 */
export const getUserNotifications = async (userId, { read, limit = 20, page = 1 } = {}) => {
  const filter = { recipient: userId };

  if (read !== undefined && read !== null && read !== '') {
    filter.read = read === true || read === 'true';
  }

  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const skip = (parsedPage - 1) * parsedLimit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate('sender', 'name email role')
      .lean(),
    Notification.countDocuments(filter),
    getUnreadCount(userId),
  ]);

  return {
    notifications,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit) || 1,
    unreadCount,
  };
};

export default getUserNotifications;
