import { Router } from 'express';
import { getAnalytics } from '../controllers/analyticsController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, getAnalytics);

export default router;
