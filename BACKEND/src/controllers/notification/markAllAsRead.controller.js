import notificationService from '../../services/notification/index.js';

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

export default markAllAsRead;
