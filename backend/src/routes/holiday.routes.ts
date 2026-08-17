import { Router } from 'express';
import { addHoliday, getHolidays, deleteHoliday } from '../controllers/holiday.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getHolidays);

// Only ADMIN, HR, and MANAGER can manage holidays
router.post('/', authorizeRoles('ADMIN', 'HR'), addHoliday);
router.delete('/:id', authorizeRoles('ADMIN', 'HR'), deleteHoliday);

export default router;
