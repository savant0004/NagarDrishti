import { Router } from 'express';
import { clearConversation, getConversationHistory, getConversations, sendConversationMessage, sendPublicAssistantMessage, startConversation } from '../controllers/assistantController';
import { requireAuth } from '../middleware/auth';
import { assistantRateLimit, publicIpRateLimit } from '../middleware/assistantRateLimit';

const router = Router();
router.post('/public-chat', publicIpRateLimit(12, 60_000), sendPublicAssistantMessage);
router.use(requireAuth);
router.get('/conversations', getConversations);
router.post('/conversations', assistantRateLimit(10, 60_000), startConversation);
router.get('/conversations/:id', getConversationHistory);
router.post('/conversations/:id/messages', assistantRateLimit(12, 60_000), sendConversationMessage);
router.delete('/conversations/:id', clearConversation);

export default router;
