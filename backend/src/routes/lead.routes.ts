import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead
} from '../controllers/lead.controller';

const router = Router();

router.use(authenticateToken); // Protect all lead routes
router.use(authorizeRoles('ADMIN', 'HR', 'MANAGER'));

router.get('/', getAllLeads);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;
