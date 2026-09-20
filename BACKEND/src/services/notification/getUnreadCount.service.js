import Notification from '../../models/Notification.js';

/**
 * Get count of unread notifications for a user.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({
    recipient: userId,
    read: false,
  });
};

export default getUnreadCount;
