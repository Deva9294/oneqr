import User from '../models/User.js';
import ScanLog from '../models/ScanLog.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { UAParser } from 'ua-parser-js';

// A QR URL cannot reliably identify the scanner's installed payment app by
// User-Agent. Always route to the web profile; the visitor chooses a UPI app.
export const handleScan = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const deviceInfo = parser.getResult();
  const user = await User.findOne({ qrCode, isActive: true }).select(
    'name avatar upiId upiDeepLink qrCode qrCodeImage profiles activeProfile'
  );
  if (!user) throw new AppError('Invalid QR code', 404);

  await ScanLog.create({
    user: user._id,
    qrCode,
    type: 'profile_view',
    ipAddress: req.ip,
    userAgent,
    deviceType: deviceInfo.device.type || 'desktop',
    browser: deviceInfo.browser.name,
    os: deviceInfo.os.name,
  });
  await User.findByIdAndUpdate(user._id, { $inc: { totalScans: 1 } });

  const activeProfile = user.profiles.find((p) => p.type === user.activeProfile && p.isActive);
  res.json({
    success: true,
    type: 'public_profile',
    profile: {
      name: user.name,
      avatar: user.avatar,
      upiId: user.upiId,
      upiDeepLink: user.upiDeepLink,
      activeProfile: user.activeProfile,
      businessName: user.activeProfile === 'business' ? activeProfile?.businessName : undefined,
      gstNumber: user.activeProfile === 'business' ? activeProfile?.gstNumber : undefined,
    },
    qrCode: user.qrCode,
    qrCodeImage: user.qrCodeImage,
  });
});

export const redirectScan = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const user = await User.findOne({ qrCode, isActive: true }).select('_id');
  if (!user) return res.redirect(`${process.env.CLIENT_URL}/scan/invalid`);
  await ScanLog.create({
    user: user._id,
    qrCode,
    type: 'profile_view',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
  });
  await User.findByIdAndUpdate(user._id, { $inc: { totalScans: 1 } });
  return res.redirect(`${process.env.CLIENT_URL}/scan/${encodeURIComponent(qrCode)}`);
});

export const getUPIIntent = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const { amount, note } = req.query;
  const user = await User.findOne({ qrCode, isActive: true }).select('name upiId upiDeepLink');
  if (!user) throw new AppError('Invalid QR code', 404);

  let upiLink = user.upiDeepLink;
  if (amount !== undefined) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      throw new AppError('Amount must be greater than zero and at most 1000000', 400);
    }
    upiLink += `&am=${numericAmount.toFixed(2)}`;
  }
  if (note) upiLink += `&tn=${encodeURIComponent(String(note).slice(0, 80))}`;

  res.json({
    success: true,
    upiLink,
    upiId: user.upiId,
    payeeName: user.name,
    intentUrl: `intent://${upiLink.replace('upi://', '')}#Intent;scheme=upi;package=*;end`,
  });
});
