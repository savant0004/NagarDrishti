import { Request, Response } from 'express';
import { store } from '../services/store';

export async function getStreets(req: Request, res: Response) {
  try {
    const streets = await store.getStreets();
    return res.json({ success: true, count: streets.length, data: streets });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
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
    return res.status(500).json({ success: false, error: err.message });
  }
}
