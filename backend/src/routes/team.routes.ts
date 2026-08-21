import { Router } from 'express';
import * as TeamController from '../controllers/team.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', TeamController.getTeams);
router.post('/', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), TeamController.createTeam);
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER'), TeamController.updateTeam);
router.delete('/:id', authorizeRoles('ADMIN'), TeamController.deleteTeam);

router.post('/:id/members', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), TeamController.addTeamMembers);
router.delete('/:id/members/:employeeId', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'), TeamController.removeTeamMember);

export default router;
