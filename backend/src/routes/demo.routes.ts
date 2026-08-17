import { Router } from 'express';
import { resetDemoEnvironment, demoLogin } from '../controllers/demo.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', demoLogin);
router.post('/reset', authenticateToken, resetDemoEnvironment);

export default router;
