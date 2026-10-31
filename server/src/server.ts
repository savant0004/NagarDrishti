import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { loadRuntimeConfig } from './config';
import issueRoutes from './routes/issueRoutes';
import reportRoutes from './routes/reportRoutes';
import streetRoutes from './routes/streetRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import simulationRoutes from './routes/simulationRoutes';
import authRoutes from './routes/authRoutes';
import { store } from './services/store';
import { ensureDemoAdmin, getUserById, verifyToken } from './services/authService';
import { requireAuth, requireRole } from './middleware/auth';
import { IssueModel } from './models/Issue';
import { CitizenReportModel } from './models/CitizenReport';
import { StreetModel } from './models/Street';
import { UserModel } from './models/User';

const config = loadRuntimeConfig();
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: config.clientOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], credentials: true },
});
app.set('io', io);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({ origin: config.clientOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/streets', streetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/simulation', simulationRoutes);

let shuttingDown = false;
let databaseEverConnected = false;
let databaseIndexesInitialized = false;
app.get('/api/health', (_req, res) => {
  const database = store.getDatabaseState();
  return res.status(shuttingDown ? 503 : 200).json({
    success: !shuttingDown,
    status: shuttingDown ? 'unavailable' : 'healthy',
    kind: 'liveness',
    applicationMode: config.demoMode ? 'demo' : config.mongoUri ? 'live' : 'unavailable',
    database: { status: database, ready: store.isReady(), mongoReadyState: mongoose.connection.readyState },
    configurationValid: config.errors.length === 0,
    timestamp: new Date(),
  });
});

app.get('/api/ready', (_req, res) => {
  const ready = !shuttingDown && config.errors.length === 0 && store.isReady();
  const database = store.getDatabaseState();
  const status = shuttingDown || config.errors.length ? 'unavailable' : config.demoMode ? 'degraded' : database;
  return res.status(ready ? 200 : 503).json({
    success: ready,
    status,
    kind: 'readiness',
    applicationMode: config.demoMode ? 'demo' : config.mongoUri ? 'live' : 'unavailable',
    database: { status: database, ready: store.isReady(), mongoReadyState: mongoose.connection.readyState },
    configurationErrors: config.errors,
    timestamp: new Date(),
  });
});

app.post('/api/seed', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    if (!config.demoMode) return res.status(403).json({ success: false, code: 'DEMO_ONLY', error: 'Reseeding is available only in explicit demo mode.' });
    await store.reseedAll();
    io.to('staff').emit('data:reseeded');
    return res.json({ success: true, message: 'Demo dataset reseeded.', dataSource: store.getMode() });
  } catch {
    return res.status(500).json({ success: false, code: 'SEED_FAILED', error: 'The demo dataset could not be reseeded.' });
  }
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(error);
  const status = error?.code === 'LIMIT_FILE_SIZE' ? 413
    : error?.message?.startsWith('Only JPEG, PNG, and WEBP') ? 415
      : error?.type === 'entity.parse.failed' ? 400 : 500;
  const code = status === 413 ? 'FILE_TOO_LARGE' : status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR';
  console.error(JSON.stringify({ level: status >= 500 ? 'error' : 'warn', event: 'http_request_failed', method: req.method, path: req.path, status, code }));
  return res.status(status).json({ success: false, code, error: status === 413 ? 'Uploaded file exceeds the allowed size.' : status === 415 ? 'Only JPEG, PNG, and WEBP images are supported.' : status === 400 ? 'Request body is invalid.' : 'Internal server error.' });
});

io.use((socket, next) => {
  void (async () => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') return next(new Error('Authentication required'));
    const payload = verifyToken(token);
    if (!payload) return next(new Error('Invalid or expired session'));
    const user = await getUserById(payload.sub);
    if (!user) return next(new Error('Invalid or expired session'));
    socket.data.user = user;
    next();
  })().catch(() => next(new Error('Authentication service unavailable')));
});

io.on('connection', (socket) => {
  const user = socket.data.user as { id: string; role: string };
  if (user.role === 'admin' || user.role === 'municipal_staff') socket.join('staff');
  else socket.join(`reporter:${user.id}`);
  console.log(JSON.stringify({ level: 'info', event: 'socket_connected', role: user.role }));
  socket.on('disconnect', () => console.log(JSON.stringify({ level: 'info', event: 'socket_disconnected', role: user.role })));
});

async function connectMongoUntilShutdown() {
  if (!config.mongoUri || config.errors.length) return;
  let attempt = 0;
  while (!shuttingDown) {
    attempt += 1;
    store.setDatabaseState('connecting');
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 4000, socketTimeoutMS: 20000, maxPoolSize: 20 });
      await Promise.all([IssueModel.init(), CitizenReportModel.init(), StreetModel.init(), UserModel.init()]);
      databaseIndexesInitialized = true;
      databaseEverConnected = true;
      store.setDatabaseState('connected');
      console.log(JSON.stringify({ level: 'info', event: 'mongodb_connected' }));
      while (!shuttingDown && mongoose.connection.readyState === 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (shuttingDown) return;
      store.setDatabaseState('degraded');
      console.error(JSON.stringify({ level: 'error', event: 'mongodb_disconnected', retrying: true }));
    } catch {
      store.setDatabaseState(databaseEverConnected ? 'degraded' : 'unavailable');
      console.error(JSON.stringify({ level: 'error', event: 'mongodb_connection_failed', attempt, retrying: true }));
      await mongoose.disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, Math.min(10000, 1000 * attempt)));
    }
  }
}

mongoose.connection.on('connected', () => { databaseEverConnected = true; if (databaseIndexesInitialized) store.setDatabaseState('connected'); });
mongoose.connection.on('reconnected', () => { databaseEverConnected = true; if (databaseIndexesInitialized) store.setDatabaseState('connected'); });
mongoose.connection.on('disconnected', () => store.setDatabaseState(databaseEverConnected ? 'degraded' : 'unavailable'));
mongoose.connection.on('error', () => console.error(JSON.stringify({ level: 'error', event: 'mongodb_runtime_error' })));

if (config.errors.length) {
  console.error(JSON.stringify({ level: 'error', event: 'configuration_invalid', errors: config.errors }));
  store.setDatabaseState('unavailable');
} else if (!config.demoMode) {
  void connectMongoUntilShutdown();
}

function listenServer() {
  server.listen(config.port, () => console.log(JSON.stringify({ level: 'info', event: 'http_server_listening', port: config.port, mode: config.demoMode ? 'demo' : 'live' })));
}
if (config.demoMode) {
  void ensureDemoAdmin().then((adminReady) => {
    if (!adminReady) console.warn(JSON.stringify({ level: 'warn', event: 'demo_admin_not_configured' }));
    console.log(JSON.stringify({ level: 'info', event: 'demo_mode_enabled' }));
  }).catch(() => console.error(JSON.stringify({ level: 'error', event: 'demo_admin_initialization_failed' }))).finally(listenServer);
} else {
  listenServer();
}

let shutdownPromise: Promise<void> | undefined;
function gracefulShutdown(signal: string) {
  if (shutdownPromise) return shutdownPromise;
  shuttingDown = true;
  store.setDatabaseState('unavailable');
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));
  shutdownPromise = new Promise<void>((resolve) => {
    io.close(() => { if (server.listening) server.close(() => resolve()); else resolve(); });
  }).then(async () => { await mongoose.disconnect(); })
    .then(() => console.log(JSON.stringify({ level: 'info', event: 'shutdown_complete' })))
    .catch(() => console.error(JSON.stringify({ level: 'error', event: 'shutdown_failed' })));
  return shutdownPromise;
}
process.once('SIGINT', () => { void gracefulShutdown('SIGINT'); });
process.once('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
