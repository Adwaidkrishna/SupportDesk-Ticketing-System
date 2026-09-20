import Notification from '../../models/Notification.js';
import { getIO } from '../../socket/socket.js';

/**
 * Mark all unread notifications as read for an authorized user.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} Summary with modifiedCount and updated unreadCount (0)
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );

  try {
    const io = getIO();
    io.to(`user:${userId.toString()}`).emit('notification:count', { unreadCount: 0 });
  } catch (socketErr) {
    console.warn('[Socket] Real-time notification:count broadcast skipped:', socketErr.message);
  }

  return {
    success: true,
    modifiedCount: result.modifiedCount,
    unreadCount: 0,
  };
};

export default markAllAsRead;
