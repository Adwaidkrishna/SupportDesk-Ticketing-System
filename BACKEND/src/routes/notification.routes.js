import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all notification routes with authenticated user verification
router.use(authenticateUser);

// GET /api/v1/notifications/unread-count - Get total unread count (Precedes /:id)
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/v1/notifications/read-all - Mark all user notifications as read (Precedes /:id)
router.patch('/read-all', notificationController.markAllAsRead);

// GET /api/v1/notifications - Get paginated notifications for current user
router.get('/', notificationController.getNotifications);

// PATCH /api/v1/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', notificationController.markAsRead);

// DELETE /api/v1/notifications/:id - Delete a notification
router.delete('/:id', notificationController.deleteNotification);

export default router;
