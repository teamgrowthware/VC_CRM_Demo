import { Router } from 'express';
import * as AnalyticsController from '../controllers/analytics.controller';
import * as ProductivityController from '../controllers/analyticsController';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Protect ALL analytics routes
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'HR', 'MANAGER'));

router.get('/employees', AnalyticsController.getEmployeeStats);
router.get('/attendance', AnalyticsController.getAttendanceStats);
router.get('/tasks', AnalyticsController.getTaskStats);
router.get('/projects', AnalyticsController.getProjectStats);
router.get('/productivity', AnalyticsController.getProductivityStats);

// New Analytics Endpoints
router.get('/team-productivity', ProductivityController.getTeamProductivity);
router.get('/project-health', ProductivityController.getProjectHealth);
router.get('/efficiency', AnalyticsController.getEfficiencyStats);

export default router;
