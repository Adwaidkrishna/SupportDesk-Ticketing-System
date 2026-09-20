import User from '../../models/User.js';
import createNotification from './createNotification.service.js';

/**
 * Notify all active users with a specified role (e.g. 'agent', 'admin').
 *
 * @param {string} role - Role to notify ('customer' | 'agent' | 'admin')
 * @param {Object} data - Notification payload without recipient
 * @param {string} [excludeUserId] - Optional user ID to exclude (e.g. sender)
 * @returns {Promise<Array>} Created notifications
 */
export const notifyRole = async (role, data, excludeUserId = null) => {
  const query = { role: role.toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const users = await User.find(query).select('_id').lean();

  if (!users || users.length === 0) {
    return [];
  }

  const creationPromises = users.map((u) =>
    createNotification({
      ...data,
      recipient: u._id,
    })
  );

  return await Promise.all(creationPromises);
};

export default notifyRole;
