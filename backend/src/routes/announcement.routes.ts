import { Router } from 'express';
import {
  getActiveAnnouncements,
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
} from '../controllers/announcement.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/active', getActiveAnnouncements);
router.get('/', getAllAnnouncements);
router.get('/:id', getAnnouncementById);

router.post('/', authorizeRoles('ADMIN', 'HR'), createAnnouncement);
router.put('/:id', authorizeRoles('ADMIN', 'HR'), updateAnnouncement);
router.delete('/:id', authorizeRoles('ADMIN'), deleteAnnouncement);
router.patch('/:id/toggle', authorizeRoles('ADMIN', 'HR'), toggleAnnouncementActive);

export default router;
