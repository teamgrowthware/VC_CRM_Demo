import { Router } from 'express';
import * as ActivityController from '../controllers/activity.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.post('/heartbeat', authenticateToken, ActivityController.heartbeat);
router.post('/idle-detected', authenticateToken, ActivityController.idleDetected);
router.post('/auto-resume', authenticateToken, ActivityController.autoResumeIdle);
router.post('/resume-request', authenticateToken, ActivityController.submitResumeRequest);
router.get('/my-status', authenticateToken, ActivityController.getMyStatus);
router.post('/system-event', authenticateToken, ActivityController.reportSystemEvent);

// Admin routes
router.get('/resume-requests', authenticateToken, authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR'), ActivityController.getIdleRequests);
router.put('/resume-requests/:id/approve', authenticateToken, authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR'), ActivityController.approveIdleRequest);
router.put('/resume-requests/:id/reject', authenticateToken, authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR'), ActivityController.rejectIdleRequest);

router.get('/recent', authenticateToken, authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR'), ActivityController.getRecentActivity);
router.get('/devices', authenticateToken, authorizeRoles('ADMIN'), ActivityController.getAllDevices);
router.post('/devices/:id/revoke', authenticateToken, authorizeRoles('ADMIN'), ActivityController.revokeDevice);
router.get('/user/:userId', authenticateToken, authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR', 'EMPLOYEE'), ActivityController.getUserActivity);

export default router;
