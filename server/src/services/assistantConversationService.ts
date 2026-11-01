import { randomUUID } from 'crypto';
import { AssistantConversationModel, IAssistantMessage } from '../models/AssistantConversation';
import { store } from './store';

const MAX_STORED_MESSAGES = 40;
const demoConversations = new Map<string, any>();

function ensureAvailable() {
  if (store.getMode() === 'unavailable') throw new Error('DATABASE_UNAVAILABLE');
}

function normalize(conversation: any) {
  if (!conversation) return null;
  const value = typeof conversation.toObject === 'function' ? conversation.toObject() : conversation;
  return { ...value, id: value.id || String(value._id) };
}

function logAndThrow(operation: string, error: unknown): never {
  const value = error as { name?: string; code?: string | number } | null;
  console.error(JSON.stringify({ level: 'error', event: 'assistant_conversation_store_failed', operation, errorName: value?.name || 'Error', errorCode: value?.code || undefined }));
  throw error;
}

export async function listConversations(userId: string): Promise<any[]> {
  ensureAvailable();
  if (store.getMode() === 'demo') {
    return [...demoConversations.values()].filter((item) => item.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 50).map(normalize);
  }
  try { return (await AssistantConversationModel.find({ userId }).select('id userId title createdAt updatedAt').sort({ updatedAt: -1 }).limit(50)).map(normalize); }
  catch (error) { logAndThrow('list', error); }
}

export async function createConversation(userId: string): Promise<any> {
  ensureAvailable();
  const now = new Date();
  const conversation = { id: randomUUID(), userId, title: 'New conversation', messages: [], createdAt: now, updatedAt: now };
  if (store.getMode() === 'demo') { demoConversations.set(conversation.id, conversation); return normalize(conversation); }
  try { return normalize(await AssistantConversationModel.create(conversation)); }
  catch (error) { logAndThrow('create', error); }
}

export async function getConversation(userId: string, id: string): Promise<any | null> {
  ensureAvailable();
  if (store.getMode() === 'demo') {
    const conversation = demoConversations.get(id);
    return conversation?.userId === userId ? normalize(conversation) : null;
  }
  try { return normalize(await AssistantConversationModel.findOne({ id, userId })); }
  catch (error) { logAndThrow('read', error); }
}

export async function appendConversationTurn(userId: string, id: string, userText: string, assistantText: string): Promise<any | null> {
  ensureAvailable();
  const turn: IAssistantMessage[] = [
    { role: 'user', content: userText, createdAt: new Date() },
    { role: 'assistant', content: assistantText, createdAt: new Date() },
  ];
  if (store.getMode() === 'demo') {
    const conversation = demoConversations.get(id);
    if (!conversation || conversation.userId !== userId) return null;
    const title = conversation.messages.length ? conversation.title : userText.replace(/\s+/g, ' ').slice(0, 80);
    const updated = { ...conversation, title: title || 'New conversation', messages: [...conversation.messages, ...turn].slice(-MAX_STORED_MESSAGES), updatedAt: new Date() };
    demoConversations.set(id, updated);
    return normalize(updated);
  }
  try {
    const conversation = await AssistantConversationModel.findOne({ id, userId }).select('id title messages');
    if (!conversation) return null;
    const title = conversation.messages.length ? conversation.title : userText.replace(/\s+/g, ' ').slice(0, 80) || 'New conversation';
    return normalize(await AssistantConversationModel.findOneAndUpdate({ id, userId }, {
      $set: { title },
      $push: { messages: { $each: turn, $slice: -MAX_STORED_MESSAGES } },
    }, { new: true, runValidators: true }));
  } catch (error) { logAndThrow('append turn', error); }
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  ensureAvailable();
  if (store.getMode() === 'demo') {
    const conversation = demoConversations.get(id);
    if (!conversation || conversation.userId !== userId) return false;
    return demoConversations.delete(id);
  }
  try { return !!(await AssistantConversationModel.findOneAndDelete({ id, userId })); }
  catch (error) { logAndThrow('delete', error); }
}

export const assistantConversationLimits = { maxStoredMessages: MAX_STORED_MESSAGES };
