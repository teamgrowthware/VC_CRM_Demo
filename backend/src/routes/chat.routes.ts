import { Router } from 'express';
import * as ChatController from '../controllers/chat.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { chatUpload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/rooms', ChatController.createChatRoom);
router.get('/clients', authorizeRoles('ADMIN', 'MANAGER', 'HR', 'EMPLOYEE', 'PROJECT_MANAGER'), ChatController.getChatClients);
router.get('/rooms', ChatController.getMyChatRooms);
router.post('/messages', ChatController.sendMessage);
router.get('/rooms/:roomId/messages', ChatController.getMessagesByRoom);
router.post('/upload', chatUpload.single('file'), ChatController.uploadChatFile);

// Advanced Routes
router.put('/rooms/:roomId', ChatController.updateGroup);
router.delete('/rooms/:roomId', ChatController.softDeleteGroup);
router.post('/rooms/:roomId/restore', ChatController.restoreGroup);
router.post('/rooms/:roomId/members', ChatController.addGroupMember);
router.delete('/rooms/:roomId/members/:userId', ChatController.removeGroupMember);
router.put('/rooms/:roomId/preferences', ChatController.updateChatPreferences);

export default router;
