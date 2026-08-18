import { Router } from 'express';
import * as AnalyticsController from '../controllers/analytics.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'HR', 'MANAGER'));

router.get('/employees', AnalyticsController.getEmployeeStats);
router.get('/attendance', AnalyticsController.getAttendanceStats);
router.get('/tasks', AnalyticsController.getTaskStats);
router.get('/projects', AnalyticsController.getProjectStats);
router.get('/productivity', AnalyticsController.getProductivityStats);
router.get('/team-productivity', AnalyticsController.getTeamProductivity);
router.get('/project-health', AnalyticsController.getProjectHealth);
router.get('/efficiency', AnalyticsController.getEfficiencyStats);

export default router;
