import { Router } from 'express';
import { getActiveAnnouncements } from '../controllers/announcement.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/active', getActiveAnnouncements);

export default router;
