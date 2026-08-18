import { Router } from 'express';
import {
  startTimer,
  stopTimer,
  getActiveTimer,
  getTaskTimeEntries,
  getUserTimeEntries
} from '../controllers/time.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/start', startTimer);
router.post('/stop', stopTimer);
router.get('/active', getActiveTimer);
router.get('/task/:taskId', getTaskTimeEntries);
router.get('/user/:userId', getUserTimeEntries);

export default router;
