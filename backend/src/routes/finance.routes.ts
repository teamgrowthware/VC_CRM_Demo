import { Router } from 'express';
import { 
  getFinanceOverview, 
  getPayrollRecords, 
  generatePayroll, 
  paySalary, 
  addDeduction, 
  addAddon,
  getSalaryDeductions,
  deleteSalaryDeduction,
  getSalaryAddons,
  deleteSalaryAddon,
  getExpenses, 
  addExpense, 
  deleteExpense,
  getPettyCash, 
  addPettyCash, 
  deletePettyCash,
  verifyFinancePin,
  updateFinancePin
} from '../controllers/finance.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Finance routes: ADMIN, HR, MANAGER can view/manage employee-level finance data.
// Sensitive admin actions (generate payroll, pay salary, change PIN) stay ADMIN-only.
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'HR', 'MANAGER'));

router.get('/overview', getFinanceOverview);
router.get('/payroll', getPayrollRecords);
router.post('/payroll/generate', authorizeRoles('ADMIN'), generatePayroll);
router.patch('/payroll/:id/pay', authorizeRoles('ADMIN'), upload.single('paymentProof'), paySalary);

router.post('/deductions', addDeduction);
router.get('/deductions', getSalaryDeductions);
router.delete('/deductions/:id', deleteSalaryDeduction);

router.post('/addons', addAddon);
router.get('/addons', getSalaryAddons);
router.delete('/addons/:id', deleteSalaryAddon);

router.get('/expenses', getExpenses);
router.post('/expenses', addExpense);
router.delete('/expenses/:id', deleteExpense);

router.get('/petty-cash', getPettyCash);
router.post('/petty-cash', addPettyCash);
router.delete('/petty-cash/:id', deletePettyCash);

router.post('/verify-pin', verifyFinancePin);
router.patch('/pin', authorizeRoles('ADMIN'), updateFinancePin);

export default router;
