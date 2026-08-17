import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import {
  getAllExpenses,
  createExpense,
  updateExpenseStatus,
  deleteExpense
} from '../controllers/expense.controller';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'HR', 'MANAGER'));

router.get('/', getAllExpenses);
router.post('/', createExpense);
router.patch('/:id/status', updateExpenseStatus);
router.delete('/:id', deleteExpense);

export default router;
