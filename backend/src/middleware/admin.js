import { AppError } from '../utils/AppError.js';

// Admin access is granted only by an explicit role or an environment allowlist.
// Configure ADMIN_EMAILS as a comma-separated list of trusted account emails.
export const requireAdmin = (req, res, next) => {
  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const emailAllowed = req.user?.email && allowedEmails.includes(req.user.email.toLowerCase());
  if (req.user?.role !== 'admin' && !emailAllowed) {
    return next(new AppError('Administrator access required', 403));
  }
  next();
};
