import { Router } from 'express';
import * as EmployeeAnalyticsController from '../controllers/employeeAnalytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router({ mergeParams: true });

// All employee profile insight routes require basic authentication.
router.use(authenticateToken);

// The endpoints naturally resolve behind `/api/employees/:id/` due to the mergeParams configuration and our app.ts mount setup.
router.get('/profile', EmployeeAnalyticsController.getEmployeeProfile);
router.get('/attendance', EmployeeAnalyticsController.getEmployeeAttendanceStats);
router.get('/tasks', EmployeeAnalyticsController.getEmployeeTaskStats);
router.get('/projects', EmployeeAnalyticsController.getEmployeeProjectStats);
router.get('/reports', EmployeeAnalyticsController.getEmployeeReportStats);

export default router;
