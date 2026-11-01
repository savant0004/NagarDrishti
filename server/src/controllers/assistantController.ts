import { Request, Response } from 'express';
import { AssistantHistoryMessage, AssistantServiceError, generateAssistantReply } from '../services/aiAssistantService';
import { AuthenticatedRequest } from '../middleware/auth';
import { appendConversationTurn, createConversation, deleteConversation, getConversation, listConversations } from '../services/assistantConversationService';
import { getGroqTextModel } from '../services/groqClient';

function currentUser(req: Request) { return (req as AuthenticatedRequest).authUser!; }

function sendAssistantError(res: Response, error: unknown) {
  if (error instanceof AssistantServiceError) {
    const statusByKind: Record<AssistantServiceError['kind'], number> = {
      not_configured: 503,
      provider_unavailable: 503,
      model_unavailable: 503,
      provider_rejected: 502,
      rate_limited: 429,
      timeout: 504,
      invalid_response: 502,
    };
    return res.status(statusByKind[error.kind]).json({ success: false, code: error.kind.toUpperCase(), error: error.message });
  }
  if (error instanceof Error && (error.message === 'DATABASE_UNAVAILABLE' || error.message.includes('MongoDB is unavailable'))) {
    return res.status(503).json({ success: false, code: 'DATABASE_UNAVAILABLE', error: 'Assistant conversations or complaint data are temporarily unavailable.' });
  }
  const value = error as { name?: string; code?: string | number } | null;
  console.error(JSON.stringify({ level: 'error', event: 'assistant_request_failed', errorName: value?.name || 'Error', errorCode: value?.code || undefined }));
  return res.status(500).json({ success: false, code: 'ASSISTANT_ERROR', error: 'The assistant request failed. Please retry.' });
}

export async function getConversations(req: Request, res: Response) {
  try {
    const conversations = await listConversations(currentUser(req).id);
    const data = conversations.map((conversation) => ({ id: conversation.id, title: conversation.title, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt }));
    return res.json({ success: true, data });
  } catch (error) { return sendAssistantError(res, error); }
}

export async function startConversation(req: Request, res: Response) {
  try {
    const conversation = await createConversation(currentUser(req).id);
    return res.status(201).json({ success: true, data: conversation });
  } catch (error) { return sendAssistantError(res, error); }
}

export async function getConversationHistory(req: Request, res: Response) {
  try {
    const conversation = await getConversation(currentUser(req).id, req.params.id);
    if (!conversation) return res.status(404).json({ success: false, code: 'CONVERSATION_NOT_FOUND', error: 'Conversation not found.' });
    return res.json({ success: true, data: conversation });
  } catch (error) { return sendAssistantError(res, error); }
}

export async function sendConversationMessage(req: Request, res: Response) {
  const user = currentUser(req);
  const content = req.body?.content;
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ success: false, code: 'EMPTY_MESSAGE', error: 'Enter a message before sending.' });
  if (content.trim().length > 2000) return res.status(413).json({ success: false, code: 'MESSAGE_TOO_LONG', error: 'Messages must be 2,000 characters or fewer.' });

  try {
    const conversation = await getConversation(user.id, req.params.id);
    if (!conversation) return res.status(404).json({ success: false, code: 'CONVERSATION_NOT_FOUND', error: 'Conversation not found.' });
    const history = (conversation.messages || []).map((message: any) => ({ role: message.role, content: message.content }));
    const reply = await generateAssistantReply(user, history, content.trim());
    const updated = await appendConversationTurn(user.id, conversation.id, content.trim(), reply);
    if (!updated) return res.status(404).json({ success: false, code: 'CONVERSATION_NOT_FOUND', error: 'Conversation not found.' });
    return res.json({ success: true, data: { conversation: updated, reply, model: getGroqTextModel() } });
  } catch (error) { return sendAssistantError(res, error); }
}

export async function clearConversation(req: Request, res: Response) {
  try {
    const deleted = await deleteConversation(currentUser(req).id, req.params.id);
    if (!deleted) return res.status(404).json({ success: false, code: 'CONVERSATION_NOT_FOUND', error: 'Conversation not found.' });
    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) { return sendAssistantError(res, error); }
}

export async function sendPublicAssistantMessage(req: Request, res: Response) {
  const content = req.body?.content;
  const suppliedHistory = req.body?.history;
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ success: false, code: 'EMPTY_MESSAGE', error: 'Enter a message before sending.' });
  if (content.trim().length > 2000) return res.status(413).json({ success: false, code: 'MESSAGE_TOO_LONG', error: 'Messages must be 2,000 characters or fewer.' });
  if (suppliedHistory !== undefined && (!Array.isArray(suppliedHistory) || suppliedHistory.length > 14 || suppliedHistory.some((item: any) => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 1600))) {
    return res.status(400).json({ success: false, code: 'INVALID_HISTORY', error: 'Conversation history is invalid. Start a new conversation and retry.' });
  }
  try {
    const history = (suppliedHistory || []) as AssistantHistoryMessage[];
    const reply = await generateAssistantReply({ id: 'public', role: 'public', department: '' }, history, content.trim());
    return res.json({ success: true, data: { reply, model: getGroqTextModel(), persisted: false } });
  } catch (error) { return sendAssistantError(res, error); }
}
