import { Router } from 'express';
import { getAllRevenue, createRevenue, deleteRevenue, getRevenueStats } from '../controllers/revenue.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/', getAllRevenue);
router.post('/', createRevenue);
router.delete('/:id', deleteRevenue);
router.get('/stats', getRevenueStats);

export default router;
