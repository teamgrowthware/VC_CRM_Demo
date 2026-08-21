import { Router } from 'express';
import * as NotificationController from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken); // Must be logged in to view your notifications

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/read-all', NotificationController.markAllAsRead);
router.delete('/all', NotificationController.clearAllNotifications);
router.patch('/:id/read', NotificationController.markAsRead);

export default router;
