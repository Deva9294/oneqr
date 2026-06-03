import cloudinary from '../config/cloudinary.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import ExpiryLink from '../models/ExpiryLink.js';
import ScanLog from '../models/ScanLog.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendOTP } from '../services/smsService.js';
import { fetchAadhaarFromUIDAI, fetchPANFromNSDL, fetchDLFromParivahan } from '../services/governmentApiService.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCloudinaryConfigured = () => {
  const cn = process.env.CLOUDINARY_CLOUD_NAME;
  return cn && !cn.includes('your_');
};

// Upload document
export const uploadDocument = catchAsync(async (req, res) => {
  const { title, type, category } = req.body;
  if (!req.file) throw new AppError('Please upload a file', 400);

  const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : req.file.mimetype.includes('zip') ? 'zip' : 'image';

  let fileUrl = req.file.path.replace(/\\/g, '/');
  let filePublicId = '';

  if (isCloudinaryConfigured()) {
    const uploadRes = await cloudinary.uploader.upload(req.file.path, {
      folder: `oneqr/documents/${req.user._id}`,
      resource_type: fileType === 'pdf' ? 'raw' : 'image',
    });
    fileUrl = uploadRes.secure_url;
    filePublicId = uploadRes.public_id;
  } else {
    console.warn('Cloudinary not configured, serving file from local path:', fileUrl);
    fileUrl = `http://localhost:${process.env.PORT || 5001}/uploads/${path.basename(req.file.path)}`;
  }

  const doc = await Document.create({
    user: req.user._id,
    title,
    type,
    category: category || (['aadhaar', 'pan', 'driving_license'].includes(type) ? 'government' : 'basic'),
    fileUrl,
    filePublicId,
    fileType,
    fileSize: req.file.size,
    requiresPin: category === 'sensitive' || type === 'aadhaar' || type === 'pan' || type === 'driving_license',
  });

  res.status(201).json({ success: true, document: doc });
});

// Get user's documents
export const getDocuments = catchAsync(async (req, res) => {
  const docs = await Document.find({ user: req.user._id, isActive: true }).sort('-createdAt');
  res.json({ success: true, documents: docs });
});

// Delete document
export const deleteDocument = catchAsync(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
  if (!doc) throw new AppError('Document not found', 404);

  if (doc.filePublicId && isCloudinaryConfigured()) {
    try {
      await cloudinary.uploader.destroy(doc.filePublicId);
    } catch (err) {
      console.warn('Cloudinary destroy failed:', err.message);
    }
  }
  doc.isActive = false;
  await doc.save();

  res.json({ success: true, message: 'Document deleted' });
});

// Fetch government document
export const fetchGovernmentDocument = catchAsync(async (req, res) => {
  const { type, idNumber, dob, otp } = req.body;

  let result;
  switch (type) {
    case 'aadhaar':
      result = await fetchAadhaarFromUIDAI(idNumber, otp);
      break;
    case 'pan':
      result = await fetchPANFromNSDL(idNumber, dob);
      break;
    case 'driving_license':
      result = await fetchDLFromParivahan(idNumber, dob);
      break;
    default:
      throw new AppError('Invalid document type', 400);
  }

  if (!result.success) throw new AppError('Failed to fetch document from government server', 502);

  // Save government document reference
  const doc = await Document.create({
    user: req.user._id,
    title: type === 'aadhaar' ? 'Aadhaar Card' : type === 'pan' ? 'PAN Card' : 'Driving License',
    type,
    category: 'government',
    fileUrl: result.data.photo || '',
    fileType: 'image',
    isGovernmentFetched: true,
    governmentSource: type === 'aadhaar' ? 'UIDAI' : type === 'pan' ? 'NSDL' : 'Parivahan',
    verificationStatus: result.data.verified ? 'verified' : 'pending',
    requiresPin: true,
  });

  // Update user KYC reference
  const updateField = type === 'aadhaar' ? 'aadhaarNumber' : type === 'pan' ? 'panNumber' : 'dlNumber';
  await User.findByIdAndUpdate(req.user._id, { [updateField]: idNumber });

  res.json({ success: true, document: doc, data: result.data });
});

// ============================================
// SECURE DOCUMENT DOWNLOAD LOGIC
// ============================================

// Step 1: Request download (public endpoint)
export const requestDownload = catchAsync(async (req, res) => {
  const { docId } = req.params;
  const { method } = req.body; // 'pin' or 'otp'

  const doc = await Document.findOne({ _id: docId, isActive: true }).populate('user', 'name phone documentPin');
  if (!doc) throw new AppError('Document not found', 404);

  if (!doc.requiresPin) {
    // No PIN required - return directly
    await Document.findByIdAndUpdate(docId, { $inc: { downloadCount: 1 } });
    await User.findByIdAndUpdate(doc.user._id, { $inc: { totalDownloads: 1 } });
    return res.json({ success: true, requiresAuth: false, fileUrl: doc.fileUrl });
  }

  if (method === 'otp') {
    // Generate OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.create({
      user: doc.user._id,
      phone: doc.user.phone,
      code,
      purpose: 'document_download',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await sendOTP(doc.user.phone, code, 'document_download');

    return res.json({
      success: true,
      requiresAuth: true,
      method: 'otp',
      message: `OTP sent to owner's mobile ending in ${doc.user.phone.slice(-4)}`,
    });
  }

  if (method === 'pin') {
    return res.json({
      success: true,
      requiresAuth: true,
      method: 'pin',
      message: 'Enter 4-digit Document PIN to download',
    });
  }

  throw new AppError('Invalid authentication method', 400);
});

// Step 2: Verify and download
export const verifyAndDownload = catchAsync(async (req, res) => {
  const { docId } = req.params;
  const { method, pin, otp, scannerName } = req.body;

  const doc = await Document.findOne({ _id: docId, isActive: true }).populate('user');
  if (!doc) throw new AppError('Document not found', 404);

  let verified = false;

  if (method === 'pin') {
    if (!pin || pin.length !== 4) throw new AppError('Invalid PIN format', 400);
    verified = await doc.user.comparePin(pin);
  } else if (method === 'otp') {
    const otpRecord = await Otp.findOne({
      user: doc.user._id,
      code: otp,
      purpose: 'document_download',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) throw new AppError('Invalid or expired OTP', 400);
    if (otpRecord.attempts >= 3) throw new AppError('Too many failed attempts', 429);

    otpRecord.isUsed = true;
    otpRecord.attempts += 1;
    await otpRecord.save();
    verified = true;
  }

  if (!verified) throw new AppError('Authentication failed', 401);

  // Log the download
  await ScanLog.create({
    user: doc.user._id,
    qrCode: doc.user.qrCode,
    type: 'document_view',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Update stats
  await Document.findByIdAndUpdate(docId, { $inc: { downloadCount: 1 } });
  await User.findByIdAndUpdate(doc.user._id, { $inc: { totalDownloads: 1 } });

  res.json({
    success: true,
    fileUrl: doc.fileUrl,
    title: doc.title,
    type: doc.fileType,
    downloadedAt: new Date(),
    scannerName: scannerName || 'Anonymous',
  });
});

// ============================================
// EXPIRY LINK SYSTEM
// ============================================

export const createExpiryLink = catchAsync(async (req, res) => {
  const { docId } = req.params;
  const doc = await Document.findOne({ _id: docId, user: req.user._id, isActive: true });
  if (!doc) throw new AppError('Document not found', 404);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const link = await ExpiryLink.create({
    user: req.user._id,
    document: docId,
    token,
    expiresAt,
  });

  await Document.findByIdAndUpdate(docId, { hasExpiryLink: true, expiryLinkToken: token, expiryLinkExpiresAt: expiresAt });

  const shareUrl = `${process.env.CLIENT_URL}/d/${token}`;

  res.json({
    success: true,
    shareUrl,
    expiresAt,
    token,
  });
});

export const accessExpiryLink = catchAsync(async (req, res) => {
  const { token } = req.params;

  const link = await ExpiryLink.findOne({ token, isUsed: false, expiresAt: { $gt: new Date() } })
    .populate('document', 'title fileUrl fileType')
    .populate('user', 'name');

  if (!link) throw new AppError('Link expired or already used', 410);

  link.isUsed = true;
  link.usedAt = new Date();
  link.usedByIp = req.ip;
  await link.save();

  await Document.findByIdAndUpdate(link.document._id, {
    hasExpiryLink: false,
    expiryLinkToken: null,
    expiryLinkExpiresAt: null,
  });

  res.json({
    success: true,
    document: {
      title: link.document.title,
      fileUrl: link.document.fileUrl,
      fileType: link.document.fileType,
    },
  });
});
