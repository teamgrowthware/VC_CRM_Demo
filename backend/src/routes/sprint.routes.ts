import { Router } from 'express';
import { createSprint, getProjectSprints, updateSprintStatus, getSprint, getSprintAnalytics } from '../controllers/sprint.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), createSprint);
router.get('/project/:projectId', getProjectSprints);
router.patch('/:id/status', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), updateSprintStatus);
router.get('/:id', getSprint);
router.get('/:id/analytics', getSprintAnalytics);

export default router;
