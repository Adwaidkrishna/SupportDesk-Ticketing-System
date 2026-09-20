import api from './api.js';

/**
 * Fetch paginated notifications with optional read status filter.
 *
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {boolean|string} [params.read]
 * @returns {Promise<Object>} Data containing notifications array, pagination, and unreadCount
 */
export const getNotifications = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.read !== undefined && params.read !== null && params.read !== '') {
    query.append('read', params.read);
  }
  const queryString = query.toString() ? `?${query.toString()}` : '';
  const response = await api.get(`/notifications${queryString}`);
  return response?.data;
};

/**
 * Fetch current user's unread notifications count.
 *
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response?.data?.unreadCount ?? 0;
};

/**
 * Mark a single notification as read.
 *
 * @param {string} id - Notification ID
 * @returns {Promise<Object>} Updated notification payload
 */
export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response?.data;
};

/**
 * Mark all user notifications as read.
 *
 * @returns {Promise<Object>} Result payload
 */
export const markAllAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response?.data;
};

/**
 * Delete a single notification.
 *
 * @param {string} id - Notification ID
 * @returns {Promise<Object>} Result payload
 */
export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response?.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
