import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { UserModel, UserRole } from '../models/User';
import { store } from './store';

const scrypt = promisify(scryptCallback);
const demoUsersById = new Map<string, { id: string; name: string; email: string; passwordHash: string; role: UserRole; isActive: boolean; department?: string }>();
const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

export interface PublicUser { id: string; name: string; email: string; role: UserRole; department?: string; }
export interface AuthTokenPayload { sub: string; iat: number; exp: number; }

export class AuthServiceError extends Error {
  constructor(public readonly code: 'DATABASE_UNAVAILABLE' | 'JWT_NOT_CONFIGURED' | 'EMAIL_CONFLICT' | 'USER_NOT_FOUND') { super(code); }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) throw new AuthServiceError('JWT_NOT_CONFIGURED');
  return secret;
}

async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [scheme, salt, digest] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function publicUser(user: any): PublicUser {
  return { id: String(user.id || user._id), name: user.name, email: user.email, role: user.role, department: user.department || '' };
}

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString('base64url'); }

export function issueToken(userId: string): string {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: userId, iat: now, exp: now + TOKEN_LIFETIME_SECONDS });
  const data = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  let secret: string;
  try { secret = getJwtSecret(); } catch { return null; }
  const [header, payload, signature, extra] = token.split('.');
  if (!header || !payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (parsedHeader.alg !== 'HS256' || typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number' || parsed.exp <= now) return null;
    return { sub: parsed.sub, iat: Number(parsed.iat) || 0, exp: parsed.exp };
  } catch { return null; }
}

function assertStoreAvailable(): void {
  if (store.getMode() === 'unavailable') throw new AuthServiceError('DATABASE_UNAVAILABLE');
}

export async function registerCitizen(name: string, email: string, password: string): Promise<PublicUser> {
  assertStoreAvailable();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await createPasswordHash(password);
  if (store.getMode() === 'demo') {
    if ([...demoUsersById.values()].some((user) => user.email === normalizedEmail)) throw new AuthServiceError('EMAIL_CONFLICT');
    const user = { id: `demo-user-${randomBytes(12).toString('hex')}`, name: name.trim(), email: normalizedEmail, passwordHash, role: 'citizen' as const, isActive: true, department: '' };
    demoUsersById.set(user.id, user);
    return publicUser(user);
  }
  try {
    const user = await UserModel.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: 'citizen' });
    return publicUser(user);
  } catch (error: any) {
    if (error?.code === 11000) throw new AuthServiceError('EMAIL_CONFLICT');
    throw error;
  }
}

export async function createStaffUser(name: string, email: string, password: string, role: 'municipal_staff' | 'admin', department = ''): Promise<PublicUser> {
  assertStoreAvailable();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await createPasswordHash(password);
  if (store.getMode() === 'demo') {
    if ([...demoUsersById.values()].some((user) => user.email === normalizedEmail)) throw new AuthServiceError('EMAIL_CONFLICT');
    const user = { id: `demo-user-${randomBytes(12).toString('hex')}`, name: name.trim(), email: normalizedEmail, passwordHash, role, department, isActive: true };
    demoUsersById.set(user.id, user);
    return publicUser(user);
  }
  try {
    const user = await UserModel.create({ name: name.trim(), email: normalizedEmail, passwordHash, role, department });
    return publicUser(user);
  } catch (error: any) {
    if (error?.code === 11000) throw new AuthServiceError('EMAIL_CONFLICT');
    throw error;
  }
}

export async function authenticate(email: string, password: string): Promise<PublicUser | null> {
  assertStoreAvailable();
  const normalizedEmail = email.trim().toLowerCase();
  if (store.getMode() === 'demo') {
    const user = [...demoUsersById.values()].find((candidate) => candidate.email === normalizedEmail);
    return user?.isActive !== false && user && await verifyPassword(password, user.passwordHash) ? publicUser(user) : null;
  }
  const user = await UserModel.findOne({ email: normalizedEmail, isActive: { $ne: false } }).select('+passwordHash');
  return user && await verifyPassword(password, user.passwordHash) ? publicUser(user) : null;
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  assertStoreAvailable();
  if (store.getMode() === 'demo') {
    const user = demoUsersById.get(id);
    return user && user.isActive !== false ? publicUser(user) : null;
  }
  const user = await UserModel.findOne({ _id: id, isActive: { $ne: false } });
  return user ? publicUser(user) : null;
}

export async function getUsersByRole(roles: UserRole[]): Promise<PublicUser[]> {
  assertStoreAvailable();
  if (store.getMode() === 'demo') return [...demoUsersById.values()].filter((user) => user.isActive !== false && roles.includes(user.role)).map(publicUser);
  return (await UserModel.find({ role: { $in: roles }, isActive: { $ne: false } })).map(publicUser);
}

export async function listStaffUsers(): Promise<Array<PublicUser & { isActive: boolean }>> {
  assertStoreAvailable();
  if (store.getMode() === 'demo') return [...demoUsersById.values()].filter((user) => user.role !== 'citizen').map((user) => ({ ...publicUser(user), isActive: user.isActive !== false }));
  return (await UserModel.find({ role: { $in: ['municipal_staff', 'admin'] } }).sort({ name: 1 })).map((user) => ({ ...publicUser(user), isActive: user.isActive !== false }));
}

export async function setStaffActive(id: string, isActive: boolean): Promise<boolean> {
  assertStoreAvailable();
  if (store.getMode() === 'demo') {
    const user = demoUsersById.get(id);
    if (!user || user.role === 'citizen' || user.role === 'admin' && !isActive) return false;
    user.isActive = isActive;
    return true;
  }
  const user = await UserModel.findOneAndUpdate({ _id: id, role: 'municipal_staff' }, { $set: { isActive } }, { new: true });
  return !!user;
}

export async function ensureDemoAdmin(): Promise<boolean> {
  if (store.getMode() !== 'demo') return false;
  const email = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if ([...demoUsersById.values()].some((user) => user.email === email)) return true;
    const user = { id: 'demo-admin', name: 'NagarDrishti Demo Administrator', email, passwordHash: await createPasswordHash(password), role: 'admin' as const, isActive: true, department: '' };
  demoUsersById.set(user.id, user);
  return true;
}
