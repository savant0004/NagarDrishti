import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AuthServiceError, authenticate, createStaffUser, getUserById, issueToken, registerCitizen } from '../services/authService';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validCredentials(name: unknown, email: unknown, password: unknown): boolean {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 100
    && typeof email === 'string' && email.length <= 254 && emailPattern.test(email.trim())
    && typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

function serviceError(res: Response, error: unknown) {
  if (error instanceof AuthServiceError) {
    const map: Record<AuthServiceError['code'], { status: number; message: string }> = {
      DATABASE_UNAVAILABLE: { status: 503, message: 'Authentication is temporarily unavailable.' },
      JWT_NOT_CONFIGURED: { status: 503, message: 'Authentication service is not configured.' },
      EMAIL_CONFLICT: { status: 409, message: 'An account with that email already exists.' },
      USER_NOT_FOUND: { status: 404, message: 'User not found.' },
    };
    const result = map[error.code];
    return res.status(result.status).json({ success: false, code: error.code, error: result.message });
  }
  console.error(JSON.stringify({ level: 'error', event: 'auth_operation_failed', errorName: error instanceof Error ? error.name : 'Error' }));
  return res.status(500).json({ success: false, code: 'AUTH_ERROR', error: 'Authentication request failed.' });
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body || {};
  if (!validCredentials(name, email, password)) return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Provide a name, valid email, and password of at least 12 characters.' });
  try {
    const user = await registerCitizen(name, email, password);
    const token = issueToken(user.id);
    return res.status(201).json({ success: true, data: { user, token } });
  } catch (error) { return serviceError(res, error); }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !emailPattern.test(email.trim()) || password.length > 128) {
    return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Provide a valid email and password.' });
  }
  try {
    const user = await authenticate(email, password);
    if (!user) return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', error: 'Email or password is incorrect.' });
    return res.json({ success: true, data: { user, token: issueToken(user.id) } });
  } catch (error) { return serviceError(res, error); }
}

export async function currentUser(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).authUser;
  return res.json({ success: true, data: { user } });
}

export async function createStaff(req: Request, res: Response) {
  const { name, email, password, role = 'municipal_staff' } = req.body || {};
  if (!validCredentials(name, email, password) || !['municipal_staff', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Provide a name, valid email, password of at least 12 characters, and supported staff role.' });
  }
  try {
    const user = await createStaffUser(name, email, password, role);
    return res.status(201).json({ success: true, data: { user } });
  } catch (error) { return serviceError(res, error); }
}
