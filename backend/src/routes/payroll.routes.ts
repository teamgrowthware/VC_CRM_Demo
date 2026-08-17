import { Router } from 'express';
import * as PayrollController from '../controllers/payroll.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/my-payroll', PayrollController.getMyPayroll);
router.get('/group-payroll', PayrollController.getGroupPayroll);

export default router;
