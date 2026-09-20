import notificationService from '../../services/notification/index.js';

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

export default getUnreadCount;
