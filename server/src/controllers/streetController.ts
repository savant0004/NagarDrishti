import { Request, Response } from 'express';
import { store } from '../services/store';

export async function getStreets(req: Request, res: Response) {
  try {
    const streets = await store.getStreets();
    return res.json({ success: true, count: streets.length, data: streets });
  } catch (err: any) {
    return sendStreetError(res, err);
  }
}

export async function getStreetByName(req: Request, res: Response) {
  try {
    const street = await store.getStreetByName(req.params.name);
    if (!street) {
      return res.status(404).json({ success: false, error: 'Street not found' });
    }
    return res.json({ success: true, data: street });
  } catch (err: any) {
    return sendStreetError(res, err);
  }
}

function sendStreetError(res: Response, error: any) {
  const unavailable = String(error?.message || '').includes('MongoDB is unavailable') || String(error?.message || '').includes('DEMO_MODE is disabled');
  if (!unavailable) console.error(JSON.stringify({ level: 'error', event: 'street_read_failed', errorName: error?.name || 'Error' }));
  return res.status(unavailable ? 503 : 500).json({ success: false, code: unavailable ? 'DATABASE_UNAVAILABLE' : 'STREET_READ_FAILED', error: unavailable ? 'Street records are temporarily unavailable.' : 'Unable to retrieve street records.' });
}
