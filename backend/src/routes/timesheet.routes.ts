import { Router } from 'express';
import { 
  startTimer, 
  pauseTimer, 
  resumeTimer, 
  stopTimer, 
  getActiveTimer,
  addManualEntry,
  getMyTimesheets,
  getAdminOverview,
  getAdminEntries,
  approveEntry,
  rejectEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getProjectAnalytics,
  getTeamAnalytics,
  getAttendanceVsTracked
} from '../controllers/timesheet.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Employee & Shared Routes
router.use(authenticateToken);

router.post('/timer/start', startTimer);
router.post('/timer/pause', pauseTimer);
router.post('/timer/resume', resumeTimer);
router.post('/timer/stop', stopTimer);
router.get('/active-timer', getActiveTimer);
router.post('/manual', addManualEntry);
router.get('/my', getMyTimesheets);
router.patch('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);

// Analytics
router.get('/analytics/attendance-comparison', getAttendanceVsTracked);
router.get('/analytics/project/:id', getProjectAnalytics);
router.get('/analytics/team', authorizeRoles('ADMIN', 'MANAGER'), getTeamAnalytics);

// Admin/Manager Routes
router.get('/admin/overview', authorizeRoles('ADMIN', 'MANAGER'), getAdminOverview);
router.get('/admin/entries', authorizeRoles('ADMIN', 'MANAGER'), getAdminEntries);
router.put('/:id/approve', authorizeRoles('ADMIN', 'MANAGER'), approveEntry);
router.put('/:id/reject', authorizeRoles('ADMIN', 'MANAGER'), rejectEntry);

export default router;
