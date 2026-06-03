import ScanLog from '../models/ScanLog.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getScanAnalytics = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { period = '30d' } = req.query;

  const days = parseInt(period) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Total scans breakdown
  const scanStats = await ScanLog.aggregate([
    { $match: { user: new (await import('mongoose')).default.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
      },
    },
  ]);

  // Daily scan trend
  const dailyTrend = await ScanLog.aggregate([
    { $match: { user: new (await import('mongoose')).default.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        scans: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Top locations
  const topLocations = await ScanLog.aggregate([
    { $match: { user: new (await import('mongoose')).default.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$location.city',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Device breakdown
  const deviceStats = await ScanLog.aggregate([
    { $match: { user: new (await import('mongoose')).default.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$deviceType',
        count: { $sum: 1 },
      },
    },
  ]);

  // Recent scans
  const recentScans = await ScanLog.find({ user: userId })
    .sort('-createdAt')
    .limit(20)
    .select('-__v');

  res.json({
    success: true,
    period: `${days} days`,
    summary: {
      totalScans: scanStats.reduce((sum, s) => sum + s.count, 0),
      paymentScans: scanStats.find((s) => s._id === 'payment')?.count || 0,
      profileViews: scanStats.find((s) => s._id === 'profile_view')?.count || 0,
      documentViews: scanStats.find((s) => s._id === 'document_view')?.count || 0,
      totalPayments: scanStats.find((s) => s._id === 'payment')?.totalAmount || 0,
    },
    dailyTrend,
    topLocations,
    deviceStats,
    recentScans,
  });
});

export const getRecentScans = catchAsync(async (req, res) => {
  const scans = await ScanLog.find({ user: req.user._id })
    .sort('-createdAt')
    .limit(10)
    .select('type deviceType browser os location upiApp amount createdAt');

  res.json({ success: true, scans });
});
