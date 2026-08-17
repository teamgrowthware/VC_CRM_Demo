import { Router } from 'express';
import * as ProjectController from '../controllers/project.controller';
import * as ProjectFinanceController from '../controllers/projectFinance.controller';
import { getProjectTimesheets, getProjectTimeSummary } from '../controllers/timesheet.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Everyone can view projects based on auth
router.use(authenticateToken);

router.get('/', ProjectController.getAllProjects);
router.get('/:id', ProjectController.getProjectById);

// Timesheets
router.get('/:id/timesheets', getProjectTimesheets);
router.get('/:id/timesheet-summary', getProjectTimeSummary);

// Elevated privileges for creating/updating
router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), ProjectController.createProject);
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), ProjectController.updateProject);
router.delete('/:id', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ProjectController.deleteProject);

// Member management
router.post('/:id/member', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), ProjectController.assignEmployeeToProject);
router.delete('/:id/member/:memberId', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), ProjectController.removeEmployeeFromProject);

// Documentation
router.post('/:id/documents', upload.single('file'), ProjectController.uploadProjectDocument);

// Project Finance & Milestones
router.get('/finance/analytics', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), ProjectFinanceController.getFinancialAnalytics);
router.get('/:id/milestones', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), ProjectFinanceController.getProjectMilestones);
router.post('/:id/milestones', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ProjectFinanceController.createMilestone);
router.put('/milestones/:milestoneId', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ProjectFinanceController.updateMilestone);
router.post('/:id/payments', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ProjectFinanceController.recordPayment);
router.post('/:id/finance/finalize', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), ProjectFinanceController.finalizeProjectFinance);

export default router;
