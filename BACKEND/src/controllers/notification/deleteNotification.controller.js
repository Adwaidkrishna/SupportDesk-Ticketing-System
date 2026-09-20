import mongoose from 'mongoose';
import notificationService from '../../services/notification/index.js';

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

export default deleteNotification;
