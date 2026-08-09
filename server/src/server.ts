import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

import issueRoutes from './routes/issueRoutes';
import reportRoutes from './routes/reportRoutes';
import streetRoutes from './routes/streetRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import simulationRoutes from './routes/simulationRoutes';
import { store } from './services/store';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.IO Hub
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS — allow all in dev, restrict to CLIENT_URL in prod
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [CLIENT_URL, ...(CLIENT_URL.includes('localhost') ? [] : ['http://localhost:5173'])]
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));


// Routes
app.use('/api/issues', issueRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/streets', streetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/simulation', simulationRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'NagarDrishti Command API',
    isUsingMongo: store.isUsingMongo(),
    timestamp: new Date(),
  });
});

app.post('/api/seed', async (req, res) => {
  await store.reseedAll();
  io.emit('data:reseeded');
  res.json({ success: true, message: 'All demo data successfully reseeded.' });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`⚡ Client connected to Socket.IO hub: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Connect Database & Start Server
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nagardrishti';

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    store.setMongoConnection(true);
  })
  .catch(() => {
    store.setMongoConnection(false);
  });

server.listen(PORT, () => {
  console.log(`
  ======================================================
  🌆 NAGARDRISHTI URBAN COMMAND BACKEND ACTIVE
  ======================================================
  📡 Server running on: http://localhost:${PORT}
  🟢 Socket.IO Hub: Active
  📁 API Health Check: http://localhost:${PORT}/api/health
  ======================================================
  `);
});
