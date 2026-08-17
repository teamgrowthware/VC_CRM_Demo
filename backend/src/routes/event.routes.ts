import { Router } from 'express';
import { getUpcomingEvents } from '../controllers/event.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/upcoming', getUpcomingEvents);

export default router;
