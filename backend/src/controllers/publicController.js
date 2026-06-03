import User from '../models/User.js';
import Document from '../models/Document.js';
import ScanLog from '../models/ScanLog.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getPublicDocuments = catchAsync(async (req, res) => {
  const { qrCode } = req.params;

  const user = await User.findOne({ qrCode, isActive: true });
  if (!user) {
    return res.json({ success: true, documents: [] });
  }

  const documents = await Document.find({
    user: user._id,
    isActive: true,
    category: { $in: ['basic', 'government'] },
  }).select('title type category requiresPin createdAt');

  res.json({ success: true, documents });
});

export const getPublicProfile = catchAsync(async (req, res) => {
  const { qrCode } = req.params;

  const user = await User.findOne({ qrCode, isActive: true }).select(
    '-password -documentPin -aadhaarNumber -panNumber -dlNumber -email -phone'
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
      bloodGroup: user.bloodGroup,
      emergencyContacts: user.emergencyContacts,
      medicalConditions: user.medicalConditions,
      activeProfile: user.activeProfile,
      businessName: activeProfile?.businessName,
      gstNumber: activeProfile?.gstNumber,
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
