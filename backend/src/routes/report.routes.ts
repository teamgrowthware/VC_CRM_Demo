import { Router } from 'express';
import * as ReportController from '../controllers/report.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/sod', ReportController.createSODReport);
router.patch('/eod/:id', ReportController.submitEODReport);
router.get('/my', ReportController.getEmployeeReports);
router.get('/date/:date', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), ReportController.getReportsByDate);
router.get('/team', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), ReportController.getTeamReports);

export default router;
