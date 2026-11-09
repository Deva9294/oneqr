import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import { connectDB } from './config/db.js';
import { AppError } from './utils/AppError.js';
import authRoutes from './routes/authRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import scanRoutes from './routes/scanRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

try {
  await connectDB();
} catch (error) {
  console.error('MongoDB connection failed:', error.message);
  if (process.env.NODE_ENV === 'production') {
    // Do not advertise a healthy production service when persistence is down.
    process.exit(1);
  }
  console.warn('Development mode: API routes requiring MongoDB will be unavailable.');
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new AppError('Origin is not allowed by CORS', 403));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  dotfiles: 'deny', index: false, maxAge: '1h',
}));

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public', publicRoutes);

app.all('*', (req, res, next) => next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404)));

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) console.error('Request failed:', err.message);
  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Internal Server Error'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = Number(process.env.PORT) || 5000;
const server = app.listen(PORT, () => console.log(`OneQR API listening on port ${PORT}`));

const shutdown = (signal) => {
  console.log(`${signal} received; closing HTTP and MongoDB connections.`);
  server.close(async () => {
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
