import { Router } from 'express';
import {
  getRecentPayslips,
  getMyPayslips,
  getAllPayslips,
  generateAllPayslips,
  deletePayslip
} from '../controllers/payslip.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Employees can only see their own payslips
router.get('/recent', getRecentPayslips);
router.get('/mine', getMyPayslips);

// HR & Admin can generate and manage payslips for everyone
router.get('/all', authorizeRoles('ADMIN', 'HR'), getAllPayslips);
router.post('/generate', authorizeRoles('ADMIN', 'HR'), generateAllPayslips);
router.delete('/:id', authorizeRoles('ADMIN'), deletePayslip);

export default router;
