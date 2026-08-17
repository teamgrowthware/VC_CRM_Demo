import { Router } from 'express';
import { submitFeedback, reportHealth, reportCrash, getPilotStats } from '../controllers/pilot.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.post('/feedback', authenticateToken, submitFeedback);
router.post('/health', authenticateToken, reportHealth);
router.post('/crash', authenticateToken, reportCrash);
router.get('/stats', authenticateToken, authorizeRoles('ADMIN'), getPilotStats);

export default router;
