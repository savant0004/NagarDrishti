import { NextFunction, Request, Response } from 'express';
import { AuthServiceError, getUserById, PublicUser, verifyToken } from '../services/authService';

export type AuthenticatedRequest = Request & { authUser?: PublicUser };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const authorization = req.header('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Sign in to continue.' });
    const payload = verifyToken(token);
    if (!payload) return res.status(process.env.JWT_SECRET && Buffer.byteLength(process.env.JWT_SECRET) >= 32 ? 401 : 503).json({ success: false, code: 'INVALID_AUTH', error: 'Your session is invalid or expired. Sign in again.' });
    const user = await getUserById(payload.sub);
    if (!user) return res.status(401).json({ success: false, code: 'INVALID_AUTH', error: 'Your account is no longer available. Sign in again.' });
    (req as AuthenticatedRequest).authUser = user;
    next();
  })().catch((error: unknown) => {
    const unavailable = error instanceof AuthServiceError && error.code === 'DATABASE_UNAVAILABLE';
    return res.status(unavailable ? 503 : 500).json({ success: false, code: unavailable ? 'DATABASE_UNAVAILABLE' : 'AUTH_ERROR', error: unavailable ? 'Authentication is temporarily unavailable.' : 'Authentication failed.' });
  });
}

export function requireRole(...roles: PublicUser['role'][]): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user) return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Sign in to continue.' });
    if (!roles.includes(user.role)) return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'You do not have permission to perform this action.' });
    next();
  };
}
