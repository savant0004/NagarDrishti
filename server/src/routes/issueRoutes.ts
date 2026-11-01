
import { Router } from 'express';
import { getIssues, getIssueById, createIssue, updateIssue, deleteIssue, getWorkQueue, getIssueHotspots } from '../controllers/issueController';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.get('/work-queue', requireAuth, requireRole('municipal_staff', 'admin'), getWorkQueue);
router.get('/hotspots', requireAuth, requireRole('municipal_staff', 'admin'), getIssueHotspots);

router.get('/', optionalAuth, getIssues);
router.get('/:id', optionalAuth, getIssueById);
router.post('/', requireAuth, requireRole('municipal_staff', 'admin'), createIssue);
router.patch('/:id', requireAuth, requireRole('municipal_staff', 'admin'), updateIssue);
router.delete('/:id', requireAuth, requireRole('admin'), deleteIssue);

export default router;
