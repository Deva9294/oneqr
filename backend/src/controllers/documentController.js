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

const cloudinaryReady = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);
const hashOtp = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export const uploadDocument = catchAsync(async (req, res) => {
  const { title, type, category } = req.body;
  if (!req.file) throw new AppError('Please upload a file', 400);
  if (!String(title || '').trim()) throw new AppError('Document title is required', 400);
  if (process.env.NODE_ENV === 'production' && !cloudinaryReady()) {
    throw new AppError('Secure cloud document storage is not configured', 503);
  }

  const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : req.file.mimetype.includes('zip') ? 'zip' : 'image';
  let fileUrl = '';
  let filePublicId = '';
  if (cloudinaryReady()) {
    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      folder: `oneqr/documents/${req.user._id}`,
      resource_type: fileType === 'pdf' || fileType === 'zip' ? 'raw' : 'image',
      type: 'authenticated',
    });
    fileUrl = uploaded.secure_url;
    filePublicId = uploaded.public_id;
  } else {
    const baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) throw new AppError('Set API_BASE_URL or configure Cloudinary storage', 503);
    fileUrl = `${baseUrl.replace(/\/$/, '')}/uploads/${encodeURIComponent(path.basename(req.file.path))}`;
  }

  const sensitive = ['sensitive', 'government'].includes(category) || ['aadhaar', 'pan', 'driving_license'].includes(type);
  const doc = await Document.create({
    user: req.user._id,
    title: String(title).trim().slice(0, 120),
    type,
    category: category || (sensitive ? 'government' : 'basic'),
    fileUrl,
    filePublicId,
    fileType,
    fileSize: req.file.size,
    requiresPin: sensitive,
    isPublic: false,
  });
  res.status(201).json({ success: true, document: doc });
});

export const getDocuments = catchAsync(async (req, res) => {
  const docs = await Document.find({ user: req.user._id, isActive: true }).sort('-createdAt');
  res.json({ success: true, documents: docs });
});

export const deleteDocument = catchAsync(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
  if (!doc) throw new AppError('Document not found', 404);
  if (doc.filePublicId && cloudinaryReady()) {
    try {
      await cloudinary.uploader.destroy(doc.filePublicId, { resource_type: doc.fileType === 'image' ? 'image' : 'raw', type: 'authenticated' });
    } catch (error) {
      console.warn('Cloudinary delete failed:', error.message);
      throw new AppError('Could not delete stored document. Please retry.', 502);
    }
  }
  doc.isActive = false;
  await doc.save();
  res.json({ success: true, message: 'Document deleted' });
});

export const fetchGovernmentDocument = catchAsync(async (req, res) => {
  const { type, idNumber, dob, otp } = req.body;
  let result;
  if (type === 'aadhaar') result = await fetchAadhaarFromUIDAI(idNumber, otp);
  else if (type === 'pan') result = await fetchPANFromNSDL(idNumber, dob);
  else if (type === 'driving_license') result = await fetchDLFromParivahan(idNumber, dob);
  else throw new AppError('Invalid document type', 400);

  if (!result?.success) throw new AppError(result?.message || 'Authorized government integration is not configured', 503);
  if (!result.data?.fileUrl && !result.data?.photo) throw new AppError('Provider did not return a document file', 502);

  const doc = await Document.create({
    user: req.user._id,
    title: type === 'aadhaar' ? 'Aadhaar Card' : type === 'pan' ? 'PAN Card' : 'Driving License',
    type, category: 'government',
    fileUrl: result.data.fileUrl || result.data.photo,
    fileType: 'image', isGovernmentFetched: true,
    governmentSource: type === 'aadhaar' ? 'UIDAI' : type === 'pan' ? 'NSDL' : 'Parivahan',
    verificationStatus: result.data.verified ? 'verified' : 'pending',
    requiresPin: true, isPublic: false,
  });
  res.json({ success: true, document: doc });
});

export const requestDownload = catchAsync(async (req, res) => {
  const { docId } = req.params;
  const { method } = req.body;
  const doc = await Document.findOne({ _id: docId, isActive: true }).populate('user', 'name phone +documentPin');
  if (!doc) throw new AppError('Document not found', 404);

  if (!doc.requiresPin) {
    if (!doc.isPublic) throw new AppError('Document owner has not enabled public sharing', 403);
    await Document.findByIdAndUpdate(docId, { $inc: { downloadCount: 1 } });
    await User.findByIdAndUpdate(doc.user._id, { $inc: { totalDownloads: 1 } });
    return res.json({ success: true, requiresAuth: false, fileUrl: doc.fileUrl });
  }
  if (method === 'pin') {
    return res.json({ success: true, requiresAuth: true, method: 'pin', message: 'Enter the owner’s 4-digit Document PIN' });
  }
  if (method !== 'otp') throw new AppError('Invalid authentication method', 400);

  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.deleteMany({ user: doc.user._id, purpose: 'document_download', isUsed: false });
  const record = await Otp.create({
    user: doc.user._id, phone: doc.user.phone, code: hashOtp(code),
    purpose: 'document_download', expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const sent = await sendOTP(doc.user.phone, code, 'document_download');
  if (!sent.success) {
    await Otp.findByIdAndDelete(record._id);
    throw new AppError('Could not deliver OTP. Please use PIN or try again later.', 503);
  }
  res.json({
    success: true, requiresAuth: true, method: 'otp',
    message: `OTP sent to owner’s mobile ending in ${String(doc.user.phone).slice(-4)}`,
  });
});

export const verifyAndDownload = catchAsync(async (req, res) => {
  const { docId } = req.params;
  const { method, pin, otp, scannerName } = req.body;
  const doc = await Document.findOne({ _id: docId, isActive: true }).populate('user', '+documentPin');
  if (!doc) throw new AppError('Document not found', 404);

  let verified = false;
  if (method === 'pin') {
    if (!/^\d{4}$/.test(String(pin || ''))) throw new AppError('Invalid PIN format', 400);
    verified = await doc.user.comparePin(pin);
  } else if (method === 'otp') {
    const record = await Otp.findOne({
      user: doc.user._id, purpose: 'document_download', isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort('-createdAt');
    if (!record || record.attempts >= 3) throw new AppError('OTP expired or attempt limit reached', 429);
    record.attempts += 1;
    const suppliedHash = hashOtp(otp || '');
    const valid = suppliedHash.length === record.code.length &&
      crypto.timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(record.code));
    if (!valid) {
      if (record.attempts >= 3) record.isUsed = true;
      await record.save();
      throw new AppError('Invalid or expired OTP', 400);
    }
    record.isUsed = true;
    await record.save();
    verified = true;
  }
  if (!verified) throw new AppError('Authentication failed', 401);

  await ScanLog.create({
    user: doc.user._id, qrCode: doc.user.qrCode, type: 'document_view',
    ipAddress: req.ip, userAgent: req.headers['user-agent'],
  });
  await Document.findByIdAndUpdate(docId, { $inc: { downloadCount: 1 } });
  await User.findByIdAndUpdate(doc.user._id, { $inc: { totalDownloads: 1 } });
  res.json({
    success: true, fileUrl: doc.fileUrl, title: doc.title, type: doc.fileType,
    downloadedAt: new Date(), scannerName: String(scannerName || 'Anonymous').slice(0, 80),
  });
});

export const createExpiryLink = catchAsync(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.docId, user: req.user._id, isActive: true });
  if (!doc) throw new AppError('Document not found', 404);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await ExpiryLink.create({ user: req.user._id, document: doc._id, token, expiresAt });
  res.json({ success: true, shareUrl: `${process.env.CLIENT_URL}/d/${token}`, expiresAt });
});

export const accessExpiryLink = catchAsync(async (req, res) => {
  const link = await ExpiryLink.findOneAndUpdate(
    { token: req.params.token, isUsed: false, expiresAt: { $gt: new Date() } },
    { $set: { isUsed: true, usedAt: new Date(), usedByIp: req.ip } },
    { new: true }
  ).populate('document', 'title fileUrl fileType isActive requiresPin')
   .populate('user', 'name');

  if (!link || !link.document?.isActive) throw new AppError('Link expired or already used', 410);
  if (link.document.requiresPin) throw new AppError('This document requires PIN/OTP verification; use the secure download flow.', 403);
  await Document.findByIdAndUpdate(link.document._id, { hasExpiryLink: false, expiryLinkToken: null, expiryLinkExpiresAt: null });
  res.json({
    success: true,
    document: { title: link.document.title, fileUrl: link.document.fileUrl, fileType: link.document.fileType },
  });
});
