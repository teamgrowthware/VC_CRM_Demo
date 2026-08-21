import { Router } from 'express';
import * as TaskController from '../controllers/task.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticateToken);

const taskRoles = authorizeRoles('ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'HR');

router.get('/', taskRoles, TaskController.getAllTasks);
router.post('/', taskRoles, TaskController.createTask);
router.get('/employee/:id', taskRoles, TaskController.getTasksByEmployee);
router.get('/project/:id', taskRoles, TaskController.getTasksByProject);
router.put('/:id', taskRoles, TaskController.updateTask);
router.patch('/:id/status', taskRoles, TaskController.changeTaskStatus);
router.patch('/:id/assign', taskRoles, TaskController.assignTask);
router.delete('/:id', taskRoles, TaskController.deleteTask);

router.get('/:id/comments', taskRoles, TaskController.getComments);
router.post('/:id/comments', taskRoles, TaskController.addComment);

// Sub-tasks
router.post('/:id/subtasks', taskRoles, TaskController.createSubTask);
router.patch('/subtasks/:id', taskRoles, TaskController.toggleSubTask);
router.delete('/subtasks/:id', taskRoles, TaskController.deleteSubTask);

// Attachments
router.post('/:id/attachments', taskRoles, upload.single('file'), TaskController.uploadTaskAttachment);
router.delete('/attachments/:id', taskRoles, TaskController.deleteTaskAttachment);

export default router;
