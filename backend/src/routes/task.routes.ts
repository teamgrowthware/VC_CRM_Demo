import { Router } from 'express';
import * as TaskController from '../controllers/task.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', TaskController.getAllTasks);
router.post('/', TaskController.createTask);
router.get('/employee/:id', TaskController.getTasksByEmployee);
router.get('/project/:id', TaskController.getTasksByProject);
router.put('/:id', TaskController.updateTask);
router.patch('/:id/status', TaskController.changeTaskStatus);
router.patch('/:id/assign', TaskController.assignTask);
router.delete('/:id', TaskController.deleteTask);

router.get('/:id/comments', TaskController.getComments);
router.post('/:id/comments', TaskController.addComment);

// Sub-tasks
router.post('/:id/subtasks', TaskController.createSubTask);
router.patch('/subtasks/:id', TaskController.toggleSubTask);
router.delete('/subtasks/:id', TaskController.deleteSubTask);

// Attachments
router.post('/:id/attachments', upload.single('file'), TaskController.uploadTaskAttachment);
router.delete('/attachments/:id', TaskController.deleteTaskAttachment);

export default router;
