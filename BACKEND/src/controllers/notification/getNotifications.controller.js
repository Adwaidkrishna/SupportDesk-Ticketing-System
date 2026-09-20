import notificationService from '../../services/notification/index.js';

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

export default getNotifications;
