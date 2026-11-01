import { Router } from 'express';
import { getNotifications, markAllRead, markRead } from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);
router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
export default router;
