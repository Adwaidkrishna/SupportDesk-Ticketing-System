import mongoose from 'mongoose';
import notificationService from '../../services/notification/index.js';

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

export default markAsRead;
