import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import {
  getAllMeetings,
  createMeeting,
  getCalendarEvents
} from '../controllers/meeting.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllMeetings);
router.get('/calendar', getCalendarEvents);
router.post('/', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), createMeeting);

export default router;
