import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from './auth';

export function assistantRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user) return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Sign in to use the assistant.' });
    const now = Date.now();
    const current = requests.get(user.id);
    if (!current || current.resetAt <= now) {
      requests.set(user.id, { count: 1, resetAt: now + windowMs });
    } else if (current.count >= maxRequests) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, code: 'ASSISTANT_RATE_LIMITED', error: 'The assistant is receiving requests too quickly. Please wait a moment and try again.' });
    } else {
      current.count += 1;
    }
    if (requests.size > 5000) for (const [key, value] of requests) if (value.resetAt <= now) requests.delete(key);
    next();
  };
}

export function publicIpRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = requests.get(key);
    if (!current || current.resetAt <= now) requests.set(key, { count: 1, resetAt: now + windowMs });
    else if (current.count >= maxRequests) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Image analysis is receiving requests too quickly. Please wait and try again.' });
    } else current.count += 1;
    if (requests.size > 5000) for (const [address, value] of requests) if (value.resetAt <= now) requests.delete(address);
    next();
  };
}
