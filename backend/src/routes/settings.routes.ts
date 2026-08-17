import { Router } from 'express';
import { getSettings, updateSettings, getNotificationSettings, updateNotificationSettings } from '../controllers/settings.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.get('/', getSettings);
router.patch('/', authorizeRoles('ADMIN', 'HR'), updateSettings);
router.get('/notifications', getNotificationSettings);
router.put('/notifications', updateNotificationSettings);

export default router;
