import { Request, Response } from 'express';
import { store } from '../services/store';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getAnalytics(req: Request, res: Response) {
  try {
    const user = (req as AuthenticatedRequest).authUser;
    const analytics = await store.getAnalytics(user?.role === 'municipal_staff' ? { id: user.id, department: user.department } : undefined);
    if (!user || user.role === 'citizen') {
      delete analytics.staffWorkload;
      analytics.complaintHotspots = (analytics.complaintHotspots || []).map((spot: any) => ({ ...spot, latitude: Math.round(Number(spot.latitude) * 1000) / 1000, longitude: Math.round(Number(spot.longitude) * 1000) / 1000 }));
    }
    return res.json({ success: true, data: analytics });
  } catch (err: any) {
    const unavailable = String(err?.message || '').includes('MongoDB is unavailable') || String(err?.message || '').includes('DEMO_MODE is disabled');
    if (!unavailable) console.error(JSON.stringify({ level: 'error', event: 'analytics_read_failed', errorName: err?.name || 'Error' }));
    return res.status(unavailable ? 503 : 500).json({ success: false, code: unavailable ? 'DATABASE_UNAVAILABLE' : 'ANALYTICS_READ_FAILED', error: unavailable ? 'Analytics are temporarily unavailable.' : 'Unable to calculate analytics.' });
  }
}
