import { Router } from 'express';
import * as EmployeeController from '../controllers/employee.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import employeeAnalyticsRoutes from './employeeAnalytics.routes';

const router = Router();

// All employee routes require authentication
router.use(authenticateToken);

// View: Admin, HR, Manager, Project Manager, Employee (filtered)
router.get('/', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'), EmployeeController.getAllEmployees);
router.get('/:id', authorizeRoles('ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'), EmployeeController.getEmployeeById);

// Create/Update: Admin, HR
router.post('/', authorizeRoles('ADMIN', 'HR'), EmployeeController.createEmployee);
router.put('/:id', authorizeRoles('ADMIN', 'HR', 'MANAGER'), EmployeeController.updateEmployee);
router.patch('/:id/status', authorizeRoles('ADMIN', 'HR'), EmployeeController.toggleEmployeeStatus);

// Delete: Admin, HR
router.delete('/:id', authorizeRoles('ADMIN', 'HR'), EmployeeController.deleteEmployee);

// Mount Employee Analytics routing inside /:id bound seamlessly
router.use('/:id', employeeAnalyticsRoutes);

export default router;
