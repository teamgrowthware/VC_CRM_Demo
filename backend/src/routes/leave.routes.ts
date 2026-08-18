import { Router } from 'express';
import * as LeaveController from '../controllers/leave.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), LeaveController.getAllLeaves);
router.post('/', LeaveController.applyLeave);
router.get('/my', LeaveController.getMyLeaves);
router.patch('/:id/status', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), LeaveController.updateLeaveStatus);
router.put('/:id/status', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), LeaveController.updateLeaveStatus); // Keep PUT for compatibility
router.patch('/:id/mark-paid', authorizeRoles('ADMIN', 'HR'), LeaveController.markLeaveAsPaid);

export default router;
