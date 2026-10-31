
import { Router } from 'express';
import { getIssues, getIssueById, createIssue, updateIssue, deleteIssue } from '../controllers/issueController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getIssues);
router.get('/:id', getIssueById);
router.post('/', requireAuth, requireRole('municipal_staff', 'admin'), createIssue);
router.patch('/:id', requireAuth, requireRole('municipal_staff', 'admin'), updateIssue);
router.delete('/:id', requireAuth, requireRole('admin'), deleteIssue);

export default router;
