import { Request, Response } from 'express';
import { store } from '../services/store';

export async function getAnalytics(req: Request, res: Response) {
  try {
    const analytics = await store.getAnalytics();
    return res.json({ success: true, data: analytics });
  } catch (err: any) {
    const unavailable = String(err?.message || '').includes('MongoDB is unavailable') || String(err?.message || '').includes('DEMO_MODE is disabled');
    if (!unavailable) console.error(JSON.stringify({ level: 'error', event: 'analytics_read_failed', errorName: err?.name || 'Error' }));
    return res.status(unavailable ? 503 : 500).json({ success: false, code: unavailable ? 'DATABASE_UNAVAILABLE' : 'ANALYTICS_READ_FAILED', error: unavailable ? 'Analytics are temporarily unavailable.' : 'Unable to calculate analytics.' });
  }
}
