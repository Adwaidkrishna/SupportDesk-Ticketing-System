import Notification from '../../models/Notification.js';
import { getIO } from '../../socket/socket.js';
import getUnreadCount from './getUnreadCount.service.js';

/**
 * Mark a single notification as read for an authorized user.
 * Enforces ownership: only the recipient can mark their notification as read.
 *
 * @param {string|mongoose.Types.ObjectId} notificationId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  if (notification.recipient.toString() !== userId.toString()) {
    const error = new Error('Access denied: You cannot modify this notification');
    error.statusCode = 403;
    throw error;
  }

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }

  const unreadCount = await getUnreadCount(userId);

  try {
    const io = getIO();
    io.to(`user:${userId.toString()}`).emit('notification:count', { unreadCount });
  } catch (socketErr) {
    console.warn('[Socket] Real-time notification:count broadcast skipped:', socketErr.message);
  }

  return notification;
};

export default markAsRead;
