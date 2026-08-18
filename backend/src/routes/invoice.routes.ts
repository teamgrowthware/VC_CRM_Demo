import express from 'express';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoiceStatus, 
  deleteInvoice 
} from '../controllers/invoice.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';

const router = express.Router();

// All invoice routes require authentication and manager/admin/hr privileges
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'MANAGER', 'HR'));

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoiceById);
router.put('/:id/status', updateInvoiceStatus);
router.delete('/:id', deleteInvoice);

export default router;
