import { Router } from 'express';
import * as PortfolioController from '../controllers/portfolio.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// All authenticated users can view portfolio projects
router.get('/', PortfolioController.getPortfolioProjects);
router.get('/:id', PortfolioController.getPortfolioProjectById);

// Only ADMIN and PROJECT_MANAGER can create, update, and delete
router.post('/', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), PortfolioController.createPortfolioProject);
router.put('/:id', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), PortfolioController.updatePortfolioProject);
router.delete('/:id', authorizeRoles('ADMIN', 'PROJECT_MANAGER'), PortfolioController.deletePortfolioProject);

export default router;
