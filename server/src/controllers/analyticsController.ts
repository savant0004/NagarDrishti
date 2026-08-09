import { Request, Response } from 'express';
import { store } from '../services/store';

export async function getAnalytics(req: Request, res: Response) {
  try {
    const analytics = await store.getAnalytics();
    return res.json({ success: true, data: analytics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
