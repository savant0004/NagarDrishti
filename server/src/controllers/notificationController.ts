import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService';

const userId = (req: Request) => (req as AuthenticatedRequest).authUser!.id;
function failure(res: Response, error: unknown) {
  const unavailable = error instanceof Error && error.message === 'DATABASE_UNAVAILABLE';
  if (!unavailable) console.error(JSON.stringify({ level: 'error', event: 'notification_request_failed', errorName: error instanceof Error ? error.name : 'Error' }));
  return res.status(unavailable ? 503 : 500).json({ success: false, code: unavailable ? 'DATABASE_UNAVAILABLE' : 'NOTIFICATION_ERROR', error: unavailable ? 'Notifications are temporarily unavailable.' : 'The notification request failed.' });
}

export async function getNotifications(req: Request, res: Response) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const data = await listNotifications(userId(req), unreadOnly);
    return res.json({ success: true, data, unreadCount: await getUnreadNotificationCount(userId(req)) });
  } catch (error) { return failure(res, error); }
}
export async function markRead(req: Request, res: Response) {
  try {
    const notification = await markNotificationRead(userId(req), req.params.id);
    return notification ? res.json({ success: true, data: notification }) : res.status(404).json({ success: false, code: 'NOTIFICATION_NOT_FOUND', error: 'Notification not found.' });
  } catch (error) { return failure(res, error); }
}
export async function markAllRead(req: Request, res: Response) {
  try { await markAllNotificationsRead(userId(req)); return res.json({ success: true }); }
  catch (error) { return failure(res, error); }
}
