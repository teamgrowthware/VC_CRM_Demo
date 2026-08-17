import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getEmployeeReviews,
  createReview,
  getAllReviews
} from '../controllers/performance.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllReviews);
router.get('/employee/:employeeId', getEmployeeReviews);
router.post('/', createReview);

export default router;
