import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import path from 'path';
import { connectDB } from './config/db.js';
import { AppError } from './utils/AppError.js';

// Routes
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

// Connect to database
try {
  await connectDB();
} catch (err) {
  console.warn('\n=== WARNING: DATABASE NOT CONNECTED ===');
  console.warn('Server will start in LIMITED MODE. API endpoints requiring DB will fail.');
  console.warn('To fix: Whitelist IP 157.34.31.177 in MongoDB Atlas -> Network Access -> IP Whitelist');
  console.warn('=====================================\n');
}
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/public', publicRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OneQR Server running on port ${PORT}`);
});
