import mongoose from 'mongoose';
import notificationService from '../services/notification.service.js';

/**
 * Controller to fetch paginated notifications for the authenticated user.
 * Supports query params: page, limit, read ('true' | 'false').
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { page, limit, read } = req.query;

    let parsedPage = 1;
    let parsedLimit = 20;
    let parsedRead = undefined;

    if (page !== undefined && page !== null && page !== '') {
      const pageNum = Number(page);
      if (!Number.isInteger(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: Page must be a positive integer >= 1.',
        });
      }
      parsedPage = pageNum;
    }

    if (limit !== undefined && limit !== null && limit !== '') {
      const limitNum = Number(limit);
      if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: Limit must be an integer between 1 and 100.',
        });
      }
      parsedLimit = limitNum;
    }

    if (read !== undefined && read !== null && read !== '') {
      if (read !== 'true' && read !== 'false') {
        return res.status(400).json({
          success: false,
          message: 'Validation error: Read filter must be "true" or "false".',
        });
      }
      parsedRead = read === 'true';
    }

    const result = await notificationService.getUserNotifications(userId, {
      page: parsedPage,
      limit: parsedLimit,
      read: parsedRead,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch the total count of unread notifications for the authenticated user.
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to mark a single notification as read.
 */
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid notification ID format.',
      });
    }

    const notification = await notificationService.markAsRead(id, userId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to mark all notifications as read for the authenticated user.
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to delete a notification owned by the authenticated user.
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid notification ID format.',
      });
    }

    const result = await notificationService.deleteNotification(id, userId);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
