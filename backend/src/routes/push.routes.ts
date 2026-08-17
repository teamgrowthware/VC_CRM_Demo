import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { subscribe, unsubscribe, getSettings, updateSettings } from '../controllers/push.controller';

const router = Router();

// Push Subscription routes
router.post('/subscribe', authenticateToken, subscribe);
router.post('/unsubscribe', authenticateToken, unsubscribe);

// Notification Settings routes
router.get('/settings', authenticateToken, getSettings);
router.put('/settings', authenticateToken, updateSettings);

export default router;
