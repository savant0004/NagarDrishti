
import { Router } from 'express';
import { getIssues, getIssueById, createIssue, updateIssue, deleteIssue } from '../controllers/issueController';

const router = Router();

router.get('/', getIssues);
router.get('/:id', getIssueById);
router.post('/', createIssue);
router.patch('/:id', updateIssue);
router.delete('/:id', deleteIssue);

export default router;
