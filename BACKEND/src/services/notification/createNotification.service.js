import Notification from '../../models/Notification.js';
import { getIO } from '../../socket/socket.js';
import getUnreadCount from './getUnreadCount.service.js';

/**
 * Create a new notification, persist it, and emit real-time Socket.IO events.
 * Emits 'notification:new' and updated 'notification:count' to room `user:${recipient}`.
 *
 * @param {Object} data
 * @param {string|mongoose.Types.ObjectId} data.recipient - User receiving notification
 * @param {string|mongoose.Types.ObjectId} [data.sender] - Optional sender User ID
 * @param {string} data.type - Notification type enum
 * @param {string} data.title - Title text
 * @param {string} data.message - Body text
 * @param {string|mongoose.Types.ObjectId} [data.ticketId] - Associated ticket ID
 * @param {string} [data.ticketNumber] - Associated ticket number
 * @param {string} [data.targetRoute] - Navigation route
 * @returns {Promise<Object>} Created notification document
 */
export const createNotification = async (data) => {
  const notification = await Notification.create({
    recipient: data.recipient,
    sender: data.sender || null,
    type: data.type,
    title: data.title?.trim(),
    message: data.message?.trim(),
    ticketId: data.ticketId || null,
    ticketNumber: data.ticketNumber || null,
    targetRoute: data.targetRoute || null,
    read: false,
    readAt: null,
  });

  if (notification.sender) {
    await notification.populate('sender', 'name email role');
  }

  const unreadCount = await getUnreadCount(data.recipient);

  // Real-time Socket.IO emission to user-specific room
  try {
    const io = getIO();
    const recipientRoom = `user:${data.recipient.toString()}`;
    io.to(recipientRoom).emit('notification:new', notification);
    io.to(recipientRoom).emit('notification:count', { unreadCount });
  } catch (socketErr) {
    // Non-blocking in case of testing environments without active Socket.IO
    console.warn('[Socket] Real-time notification broadcast skipped:', socketErr.message);
  }

  return notification;
};

export default createNotification;
