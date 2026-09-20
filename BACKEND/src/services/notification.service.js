import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getIO } from '../socket/socket.js';

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

export default {
  createNotification,
  notifyRole,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
