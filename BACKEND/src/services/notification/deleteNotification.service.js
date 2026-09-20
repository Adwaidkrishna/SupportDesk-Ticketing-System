import Notification from '../../models/Notification.js';
import { getIO } from '../../socket/socket.js';
import getUnreadCount from './getUnreadCount.service.js';

/**
 * Delete a notification for an authorized user.
 * Enforces ownership: only the recipient can delete their notification.
 *
 * @param {string|mongoose.Types.ObjectId} notificationId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} Result and updated unreadCount
 */
export const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  if (notification.recipient.toString() !== userId.toString()) {
    const error = new Error('Access denied: You cannot delete this notification');
    error.statusCode = 403;
    throw error;
  }

  await Notification.deleteOne({ _id: notificationId });

  const unreadCount = await getUnreadCount(userId);

  try {
    const io = getIO();
    io.to(`user:${userId.toString()}`).emit('notification:count', { unreadCount });
  } catch (socketErr) {
    console.warn('[Socket] Real-time notification:count broadcast skipped:', socketErr.message);
  }

  return {
    success: true,
    unreadCount,
  };
};

export default deleteNotification;
