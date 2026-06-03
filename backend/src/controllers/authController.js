import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Document from '../models/Document.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { generateQRCode } from '../utils/generateQR.js';
import cloudinary from '../config/cloudinary.js';

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

export const register = catchAsync(async (req, res) => {
  const { name, email, phone, password, documentPin, upiId, bloodGroup } = req.body;

  if (!name || !email || !phone || !password || !documentPin || !upiId) {
    throw new AppError('Please provide all required fields', 400);
  }

  if (documentPin.length !== 4) {
    throw new AppError('Document PIN must be exactly 4 digits', 400);
  }

  // Check if user exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) throw new AppError('Email or phone already registered', 409);

  // Generate unique QR code
  const qrCode = `OQR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Generate QR image
  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&cu=INR`;
  const qrData = JSON.stringify({
    type: 'oneqr',
    id: qrCode,
    upi: upiId,
    url: `${process.env.CLIENT_URL}/scan/${qrCode}`,
  });
  const qrImageBase64 = await generateQRCode(qrData);

  // Upload QR to Cloudinary (skip if not configured)
  let qrCodeImage = qrImageBase64;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudKey = process.env.CLOUDINARY_API_KEY;
  const cloudSecret = process.env.CLOUDINARY_API_SECRET;
  const isCloudinaryConfigured = cloudName && cloudKey && cloudSecret && !cloudName.includes('your_');

  if (isCloudinaryConfigured) {
    try {
      const uploadRes = await cloudinary.uploader.upload(qrImageBase64, {
        folder: 'oneqr/qrcodes',
        public_id: qrCode,
      });
      qrCodeImage = uploadRes.secure_url;
    } catch (uploadErr) {
      console.warn('Cloudinary upload failed, using base64 fallback:', uploadErr.message);
    }
  } else {
    console.warn('Cloudinary not configured, using base64 QR image. Set CLOUDINARY_* env vars for production.');
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    documentPin,
    upiId,
    upiDeepLink,
    qrCode,
    qrCodeImage,
    bloodGroup,
    profiles: [{ type: 'personal', isActive: true }],
  });

  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      qrCode: user.qrCode,
      qrCodeImage: user.qrCodeImage,
      upiId: user.upiId,
      bloodGroup: user.bloodGroup,
    },
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Please provide email and password', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id);
  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      qrCode: user.qrCode,
      qrCodeImage: user.qrCodeImage,
      upiId: user.upiId,
      activeProfile: user.activeProfile,
    },
  });
});

export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const documents = await Document.find({ user: req.user._id, isActive: true }).sort('-createdAt');

  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      qrCode: user.qrCode,
      qrCodeImage: user.qrCodeImage,
      upiId: user.upiId,
      bloodGroup: user.bloodGroup,
      emergencyContacts: user.emergencyContacts,
      medicalConditions: user.medicalConditions,
      totalScans: user.totalScans,
      totalDownloads: user.totalDownloads,
      totalPayments: user.totalPayments,
      activeProfile: user.activeProfile,
      profiles: user.profiles,
      kycStatus: user.kycStatus,
    },
    documents,
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const updates = req.body;
  const allowed = ['name', 'bloodGroup', 'emergencyContacts', 'medicalConditions', 'activeProfile'];
  const filtered = {};
  Object.keys(updates).forEach((key) => {
    if (allowed.includes(key)) filtered[key] = updates[key];
  });

  const user = await User.findByIdAndUpdate(req.user._id, filtered, { new: true, runValidators: true });
  res.json({ success: true, user });
});

export const updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

export const updatePin = catchAsync(async (req, res) => {
  const { currentPin, newPin } = req.body;
  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    throw new AppError('PIN must be exactly 4 digits', 400);
  }
  const user = await User.findById(req.user._id);
  if (!(await user.comparePin(currentPin))) {
    throw new AppError('Current PIN is incorrect', 400);
  }
  user.documentPin = newPin;
  await user.save();
  res.json({ success: true, message: 'Document PIN updated successfully' });
});

export const updateUPI = catchAsync(async (req, res) => {
  const { upiId } = req.body;
  if (!upiId.includes('@')) throw new AppError('Invalid UPI ID', 400);

  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(req.user.name)}&cu=INR`;

  // Regenerate QR with new UPI
  const qrData = JSON.stringify({
    type: 'oneqr',
    id: req.user.qrCode,
    upi: upiId,
    url: `${process.env.CLIENT_URL}/scan/${req.user.qrCode}`,
  });
  const qrImageBase64 = await generateQRCode(qrData);
  const uploadRes = await cloudinary.uploader.upload(qrImageBase64, {
    folder: 'oneqr/qrcodes',
    public_id: req.user.qrCode,
    overwrite: true,
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { upiId, upiDeepLink, qrCodeImage: uploadRes.secure_url },
    { new: true }
  );

  res.json({ success: true, user: { upiId: user.upiId, qrCodeImage: user.qrCodeImage } });
});
