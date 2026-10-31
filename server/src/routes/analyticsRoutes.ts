import { Router } from 'express';
import { getAnalytics } from '../controllers/analyticsController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireRole('municipal_staff', 'admin'), getAnalytics);

export default router;
