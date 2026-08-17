import { Router } from 'express';
import * as AttendanceController from '../controllers/attendance.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// All attendance routes require authentication
router.use(authenticateToken);

// Employee routes
router.post('/punch-in', AttendanceController.punchIn);
router.post('/punch-out', AttendanceController.punchOut);
router.post('/break-start', AttendanceController.startBreak);
router.post('/break-end', AttendanceController.endBreak);
router.post('/lunch-start', AttendanceController.startLunch);
router.post('/lunch-end', AttendanceController.endLunch);

router.get('/today', AttendanceController.getTodayAttendance);
router.get('/history', AttendanceController.getEmployeeAttendanceHistory);
router.get('/calendar', AttendanceController.getCalendarData);

// Admin, HR, and Manager
router.get('/all', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), AttendanceController.getAllAttendance);
router.get('/analytics/early-exit', authorizeRoles('ADMIN', 'HR'), AttendanceController.getEarlyExitAnalytics);
router.patch('/:id/status', authorizeRoles('ADMIN'), AttendanceController.updateAttendanceStatus);
router.delete('/penalties/:id', authorizeRoles('ADMIN', 'HR'), AttendanceController.deletePenalty);

export default router;
