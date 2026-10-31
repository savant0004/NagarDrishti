import { Router } from 'express';
import { createStaff, currentUser, login, register } from '../controllers/authController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, currentUser);
router.post('/staff', requireAuth, requireRole('admin'), createStaff);
export default router;
