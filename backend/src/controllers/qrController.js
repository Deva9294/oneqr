import User from '../models/User.js';
import ScanLog from '../models/ScanLog.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { UAParser } from 'ua-parser-js';

/**
 * CORE QR ROUTING LOGIC
 * =====================
 * Every user's QR contains a JSON payload with:
 * { type: 'oneqr', id: qrCode, upi: upiId, url: publicProfileUrl }
 *
 * When scanned:
 * 1. UPI APPS (PhonePe, GPay, Paytm) detect the "upi://" scheme
 *    and directly open their payment flow using the upiId.
 *    They do NOT visit our server.
 *
 * 2. REGULAR CAMERAS / QR SCANNERS visit the URL in the QR payload.
 *    They hit this endpoint which detects the user-agent and returns
 *    the appropriate response.
 */

const UPI_APPS = ['phonepe', 'gpay', 'paytm', 'bhim', 'cred', 'amazonpay', 'mobikwik'];

function detectScannerType(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  for (const app of UPI_APPS) {
    if (ua.includes(app)) return 'upi_app';
  }
  if (ua.includes('upi')) return 'upi_app';
  return 'browser';
}

function getUPIAppName(userAgent) {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('phonepe')) return 'PhonePe';
  if (ua.includes('gpay') || ua.includes('tez')) return 'Google Pay';
  if (ua.includes('paytm')) return 'Paytm';
  if (ua.includes('bhim')) return 'BHIM';
  if (ua.includes('cred')) return 'CRED';
  if (ua.includes('amazonpay')) return 'Amazon Pay';
  return 'UPI App';
}

// Public endpoint: /api/qr/:qrCode/scan
export const handleScan = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const scannerType = detectScannerType(userAgent);
  const parser = new UAParser(userAgent);
  const deviceInfo = parser.getResult();

  const user = await User.findOne({ qrCode, isActive: true }).select(
    '-password -documentPin -aadhaarNumber -panNumber -dlNumber'
  );

  if (!user) throw new AppError('Invalid QR code', 404);

  // Log the scan
  const scanLog = await ScanLog.create({
    user: user._id,
    qrCode,
    type: scannerType === 'upi_app' ? 'payment' : 'profile_view',
    ipAddress: req.ip,
    userAgent,
    deviceType: deviceInfo.device.type || 'desktop',
    browser: deviceInfo.browser.name,
    os: deviceInfo.os.name,
    upiApp: scannerType === 'upi_app' ? getUPIAppName(userAgent) : undefined,
  });

  // Increment user's scan count
  await User.findByIdAndUpdate(user._id, { $inc: { totalScans: 1 } });

  // Response based on scanner type
  if (scannerType === 'upi_app') {
    // Return UPI deep link data for UPI apps
    res.json({
      success: true,
      type: 'upi_payment',
      upiId: user.upiId,
      upiDeepLink: user.upiDeepLink,
      payeeName: user.name,
      message: 'Open your UPI app to complete payment',
    });
  } else {
    // Return public profile data for browsers/cameras
    const activeProfile = user.profiles.find((p) => p.type === user.activeProfile && p.isActive);

    res.json({
      success: true,
      type: 'public_profile',
      profile: {
        name: user.name,
        avatar: user.avatar,
        upiId: user.upiId,
        upiDeepLink: user.upiDeepLink,
        bloodGroup: user.bloodGroup,
        emergencyContacts: user.emergencyContacts,
        medicalConditions: user.medicalConditions,
        activeProfile: user.activeProfile,
        businessName: activeProfile?.businessName,
        gstNumber: activeProfile?.gstNumber,
      },
      qrCode: user.qrCode,
      qrCodeImage: user.qrCodeImage,
    });
  }
});

// Redirect endpoint for web browsers: /scan/:qrCode
export const redirectScan = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const scannerType = detectScannerType(userAgent);

  const user = await User.findOne({ qrCode, isActive: true });
  if (!user) {
    return res.redirect(`${process.env.CLIENT_URL}/scan/invalid`);
  }

  // Log scan
  await ScanLog.create({
    user: user._id,
    qrCode,
    type: scannerType === 'upi_app' ? 'payment' : 'profile_view',
    ipAddress: req.ip,
    userAgent,
    upiApp: scannerType === 'upi_app' ? getUPIAppName(userAgent) : undefined,
  });

  await User.findByIdAndUpdate(user._id, { $inc: { totalScans: 1 } });

  if (scannerType === 'upi_app') {
    // Redirect to UPI deep link
    return res.redirect(user.upiDeepLink);
  }

  // Redirect to public profile page
  res.redirect(`${process.env.CLIENT_URL}/scan/${qrCode}`);
});

// Get UPI intent URL for manual payment
export const getUPIIntent = catchAsync(async (req, res) => {
  const { qrCode } = req.params;
  const { amount, note } = req.query;

  const user = await User.findOne({ qrCode, isActive: true });
  if (!user) throw new AppError('Invalid QR code', 404);

  let upiLink = user.upiDeepLink;
  if (amount) {
    upiLink += `&am=${amount}`;
  }
  if (note) {
    upiLink += `&tn=${encodeURIComponent(note)}`;
  }

  res.json({
    success: true,
    upiLink,
    upiId: user.upiId,
    payeeName: user.name,
    intentUrl: `intent://${upiLink.replace('upi://', '')}#Intent;scheme=upi;package=*;end`,
  });
});
