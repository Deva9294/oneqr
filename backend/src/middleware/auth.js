import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

export const protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) throw new AppError('Not authorized, no token', 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('+aadhaarNumber +panNumber +dlNumber');
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);
  req.user = user;
  next();
});

export const optionalAuth = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user?.isActive) req.user = user;
    } catch {
      // Public endpoints remain public when an optional token is invalid.
    }
  }
  next();
});
