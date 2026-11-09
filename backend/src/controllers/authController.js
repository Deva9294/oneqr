import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Document from '../models/Document.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { generateQRCode } from '../utils/generateQR.js';
import cloudinary from '../config/cloudinary.js';

const signToken = (id) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new AppError('Server authentication is not configured securely', 500);
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

const normalizePhone = (phone) => String(phone || '').replace(/[\s()-]/g, '');
const isValidUpi = (value) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(String(value || ''));

const createQrImage = async ({ qrCode, upiId, name }) => {
  const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
  if (!clientUrl) throw new AppError('CLIENT_URL is not configured', 500);
  // The printed QR opens OneQR in any phone camera. UPI payment is initiated
  // from the profile's explicit Pay button, not guessed from scanner User-Agent.
  const qrPayload = `${clientUrl}/scan/${encodeURIComponent(qrCode)}`;
  const qrImageBase64 = await generateQRCode(qrPayload);
  let qrCodeImage = qrImageBase64;
  const configured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
  if (configured) {
    try {
      const uploaded = await cloudinary.uploader.upload(qrImageBase64, {
        folder: 'oneqr/qrcodes', public_id: qrCode, overwrite: true,
      });
      qrCodeImage = uploaded.secure_url;
    } catch (error) {
      console.warn('QR image cloud backup failed; using generated data URL:', error.message);
    }
  }
  return { qrCodeImage, upiDeepLink: `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&cu=INR` };
};

export const register = catchAsync(async (req, res) => {
  const { name, email, password, documentPin, upiId, bloodGroup } = req.body;
  const phone = normalizePhone(req.body.phone);
  if (!name?.trim() || !email?.trim() || !phone || !password || !documentPin || !upiId) {
    throw new AppError('Please provide all required fields', 400);
  }
  if (String(password).length < 8) throw new AppError('Password must be at least 8 characters', 400);
  if (!/^\d{4}$/.test(String(documentPin))) throw new AppError('Document PIN must be exactly 4 digits', 400);
  if (!isValidUpi(upiId)) throw new AppError('Please provide a valid UPI ID', 400);

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { phone }] });
  if (existingUser) throw new AppError('Email or phone already registered', 409);

  const qrCode = `OQR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const { qrCodeImage, upiDeepLink } = await createQrImage({ qrCode, upiId, name: name.trim() });
  const user = await User.create({
    name: name.trim(), email: cleanEmail, phone, password, documentPin,
    upiId, upiDeepLink, qrCode, qrCodeImage, bloodGroup,
    profiles: [{ type: 'personal', isActive: true }],
  });
  const token = signToken(user._id);
  res.status(201).json({
    success: true, token,
    user: {
      id: user._id, name: user.name, email: user.email, phone: user.phone,
      qrCode: user.qrCode, qrCodeImage: user.qrCodeImage, upiId: user.upiId,
      bloodGroup: user.bloodGroup, activeProfile: user.activeProfile,
    },
  });
});

export const login = catchAsync(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;
  if (!email || !password) throw new AppError('Please provide email and password', 400);
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  const token = signToken(user._id);
  res.json({
    success: true, token,
    user: {
      id: user._id, name: user.name, email: user.email, phone: user.phone,
      qrCode: user.qrCode, qrCodeImage: user.qrCodeImage, upiId: user.upiId,
      activeProfile: user.activeProfile,
    },
  });
});

export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found', 404);
  const documents = await Document.find({ user: req.user._id, isActive: true }).sort('-createdAt');
  res.json({
    success: true,
    user: {
      id: user._id, name: user.name, email: user.email, phone: user.phone,
      avatar: user.avatar, qrCode: user.qrCode, qrCodeImage: user.qrCodeImage,
      upiId: user.upiId, bloodGroup: user.bloodGroup,
      emergencyContacts: user.emergencyContacts, medicalConditions: user.medicalConditions,
      totalScans: user.totalScans, totalDownloads: user.totalDownloads,
      totalPayments: user.totalPayments, activeProfile: user.activeProfile,
      profiles: user.profiles, kycStatus: user.kycStatus,
    },
    documents,
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const allowed = ['name', 'bloodGroup', 'emergencyContacts', 'medicalConditions', 'activeProfile'];
  const filtered = {};
  for (const key of allowed) if (req.body[key] !== undefined) filtered[key] = req.body[key];
  if (filtered.name !== undefined && !String(filtered.name).trim()) throw new AppError('Name cannot be empty', 400);
  const user = await User.findByIdAndUpdate(req.user._id, filtered, { new: true, runValidators: true });
  res.json({ success: true, user });
});

export const updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8) throw new AppError('New password must be at least 8 characters', 400);
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) throw new AppError('Current password is incorrect', 400);
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

export const updatePin = catchAsync(async (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!/^\d{4}$/.test(String(newPin || ''))) throw new AppError('PIN must be exactly 4 digits', 400);
  const user = await User.findById(req.user._id);
  if (!user || !(await user.comparePin(currentPin))) throw new AppError('Current PIN is incorrect', 400);
  user.documentPin = newPin;
  await user.save();
  res.json({ success: true, message: 'Document PIN updated successfully' });
});

export const updateUPI = catchAsync(async (req, res) => {
  const { upiId } = req.body;
  if (!isValidUpi(upiId)) throw new AppError('Invalid UPI ID', 400);
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found', 404);
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(user.name)}&cu=INR`;
  const qrPayload = `${(process.env.CLIENT_URL || '').replace(/\/$/, '')}/scan/${encodeURIComponent(user.qrCode)}`;
  if (!process.env.CLIENT_URL) throw new AppError('CLIENT_URL is not configured', 500);
  const qrImageBase64 = await generateQRCode(qrPayload);
  let qrCodeImage = qrImageBase64;
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const uploaded = await cloudinary.uploader.upload(qrImageBase64, {
        folder: 'oneqr/qrcodes', public_id: user.qrCode, overwrite: true,
      });
      qrCodeImage = uploaded.secure_url;
    } catch (error) {
      console.warn('QR image cloud update failed; using generated data URL:', error.message);
    }
  }
  user.upiId = upiId;
  user.upiDeepLink = upiDeepLink;
  user.qrCodeImage = qrCodeImage;
  await user.save();
  res.json({ success: true, user: { upiId: user.upiId, qrCodeImage: user.qrCodeImage } });
});
