import { Router } from 'express';
import { registerDevice, heartbeat, syncLogs, getAgentSettings } from '../controllers/agent.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/register', registerDevice);
router.post('/heartbeat', heartbeat);
router.post('/sync', syncLogs);
router.get('/settings', getAgentSettings);

export default router;
