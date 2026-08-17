import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getAllMeetings,
  createMeeting,
  getCalendarEvents
} from '../controllers/meeting.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllMeetings);
router.get('/calendar', getCalendarEvents);
router.post('/', createMeeting);

export default router;
