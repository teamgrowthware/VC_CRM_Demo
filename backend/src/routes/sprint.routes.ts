import { Router } from 'express';
import { createSprint, getProjectSprints, updateSprintStatus, getSprint, getSprintAnalytics } from '../controllers/sprint.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createSprint);
router.get('/project/:projectId', getProjectSprints);
router.patch('/:id/status', updateSprintStatus);
router.get('/:id', getSprint);
router.get('/:id/analytics', getSprintAnalytics);

export default router;
