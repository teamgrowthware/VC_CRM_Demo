import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { forgotPasswordLimiter, resetPasswordLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authenticateToken, authorizeRoles('ADMIN'), AuthController.register);
router.post('/login', AuthController.login);
router.post('/client-login', AuthController.clientLogin);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateToken, AuthController.me);
router.post('/change-password', authenticateToken, AuthController.changePassword);
router.put('/me', authenticateToken, AuthController.updateSelfProfile);
router.post('/forgot-password', forgotPasswordLimiter, AuthController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, AuthController.resetPassword);

router.get('/lockouts', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  res.json({ success: true, data: AuthController.getLoginLockouts() });
});
router.post('/clear-lockout', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }
  const cleared = AuthController.clearLoginLockout(email);
  res.json({ success: true, message: cleared ? 'Lockout cleared for ' + email : 'No lockout found for ' + email });
});

export default router;
