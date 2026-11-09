import User from '../models/User.js';
import Document from '../models/Document.js';
import ScanLog from '../models/ScanLog.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getPublicDocuments = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const user = await User.findOne({ qrCode, isActive: true }).select('_id');
  if (!user) return res.status(404).json({ success: false, documents: [] });

  // Documents are private by default. Only an owner-explicitly-shared document
  // can appear in the public QR listing; download authorization is still enforced.
  const documents = await Document.find({
    user: user._id,
    isActive: true,
    isPublic: true,
  }).select('title type category requiresPin createdAt');

  res.json({ success: true, documents });
});

export const getPublicProfile = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const user = await User.findOne({ qrCode, isActive: true }).select(
    'name avatar upiId upiDeepLink qrCode profiles activeProfile'
  );

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const activeProfile = user.profiles.find((p) => p.type === user.activeProfile && p.isActive);

  res.json({
    success: true,
    profile: {
      name: user.name,
      avatar: user.avatar,
      upiId: user.upiId,
      upiDeepLink: user.upiDeepLink,
      activeProfile: user.activeProfile,
      businessName: activeProfile?.businessName,
      // GST is business information; show only on the explicitly active business profile.
      gstNumber: user.activeProfile === 'business' ? activeProfile?.gstNumber : undefined,
    },
  });
});

export const getPublicStats = catchAsync(async (req, res) => {
  const [totalUsers, totalDocuments, totalScans, totalDownloads] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Document.countDocuments({ isActive: true }),
    ScanLog.countDocuments(),
    ScanLog.aggregate([{ $match: { type: 'document_view' } }, { $count: 'total' }]),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers: totalUsers || 0,
      totalDocuments: totalDocuments || 0,
      totalScans: totalScans || 0,
      totalDownloads: totalDownloads[0]?.total || 0,
    },
  });
});
