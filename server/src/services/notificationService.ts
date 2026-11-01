import { randomUUID } from 'crypto';
import { NotificationModel, NotificationKind } from '../models/Notification';
import { UserRole } from '../models/User';
import { store } from './store';
import { getUsersByRole } from './authService';

const demoNotifications = new Map<string, any[]>();
const isUnavailable = () => store.getMode() === 'unavailable';

export async function createNotification(userId: string, input: { kind: NotificationKind; title: string; message: string; reportId?: string; dedupeKey: string }, io?: any) {
  if (isUnavailable()) throw new Error('DATABASE_UNAVAILABLE');
  let notification: any;
  if (store.getMode() === 'demo') {
    const own = demoNotifications.get(userId) || [];
    if (own.some((item) => item.dedupeKey === input.dedupeKey)) return null;
    notification = { id: randomUUID(), userId, ...input, readAt: null, createdAt: new Date() };
    own.unshift(notification);
    demoNotifications.set(userId, own.slice(0, 100));
  } else {
    try {
      notification = await NotificationModel.create({ id: randomUUID(), userId, ...input });
    } catch (error: any) {
      if (error?.code === 11000) return null;
      console.error(JSON.stringify({ level: 'error', event: 'notification_persistence_failed', errorName: error?.name || 'Error' }));
      throw error;
    }
  }
  io?.to(`user:${userId}`).emit('notification:new', notification);
  return notification;
}

export async function notifyRoles(roles: UserRole[], input: { kind: NotificationKind; title: string; message: string; reportId?: string; dedupeKey: string }, io?: any) {
  const users = await getUsersByRole(roles);
  await Promise.all(users.map((user) => createNotification(user.id, { ...input, dedupeKey: `${input.dedupeKey}:${user.id}` }, io).catch(() => null)));
}

export async function listNotifications(userId: string, unreadOnly = false) {
  if (isUnavailable()) throw new Error('DATABASE_UNAVAILABLE');
  if (store.getMode() === 'demo') return (demoNotifications.get(userId) || []).filter((item) => !unreadOnly || !item.readAt).slice(0, 100);
  const filter: any = { userId };
  if (unreadOnly) filter.readAt = null;
  return NotificationModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (isUnavailable()) throw new Error('DATABASE_UNAVAILABLE');
  if (store.getMode() === 'demo') return (demoNotifications.get(userId) || []).filter((item) => !item.readAt).length;
  return NotificationModel.countDocuments({ userId, readAt: null });
}

export async function markNotificationRead(userId: string, id: string) {
  if (isUnavailable()) throw new Error('DATABASE_UNAVAILABLE');
  if (store.getMode() === 'demo') {
    const own = demoNotifications.get(userId) || [];
    const notification = own.find((item) => item.id === id);
    if (!notification) return null;
    notification.readAt = notification.readAt || new Date();
    return notification;
  }
  return NotificationModel.findOneAndUpdate({ id, userId }, { $set: { readAt: new Date() } }, { new: true });
}

export async function markAllNotificationsRead(userId: string) {
  if (isUnavailable()) throw new Error('DATABASE_UNAVAILABLE');
  if (store.getMode() === 'demo') {
    for (const item of demoNotifications.get(userId) || []) if (!item.readAt) item.readAt = new Date();
    return;
  }
  await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
}
