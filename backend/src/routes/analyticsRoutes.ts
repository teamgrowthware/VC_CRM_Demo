import { Router } from 'express';
import * as AnalyticsController from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/team-productivity', AnalyticsController.getTeamProductivity);
router.get('/project-health', AnalyticsController.getProjectHealth);

export default router;
