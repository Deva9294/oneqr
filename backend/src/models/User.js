import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String, required: true },
  phone: { type: String, required: true },
});

const profileSchema = new mongoose.Schema({
  type: { type: String, enum: ['personal', 'business'], default: 'personal' },
  businessName: { type: String },
  gstNumber: { type: String },
  businessAddress: { type: String },
  isActive: { type: Boolean, default: true },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: '' },

    // QR & UPI
    qrCode: { type: String, required: true, unique: true },
    qrCodeImage: { type: String, required: true },
    upiId: { type: String, required: true },
    upiDeepLink: { type: String },

    // Security
    documentPin: { type: String, required: true, minlength: 4, maxlength: 4 },
    isPinVerified: { type: Boolean, default: false },

    // Emergency Info
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    emergencyContacts: [emergencyContactSchema],
    medicalConditions: [{ type: String }],

    // Profiles
    profiles: [profileSchema],
    activeProfile: { type: String, enum: ['personal', 'business'], default: 'personal' },

    // Stats
    totalScans: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    totalPayments: { type: Number, default: 0 },

    // Verification
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Government IDs
    aadhaarNumber: { type: String, select: false },
    panNumber: { type: String, select: false },
    dlNumber: { type: String, select: false },

    // KYC Status
    kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('documentPin')) return next();
  this.documentPin = await bcrypt.hash(this.documentPin, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePin = async function (candidatePin) {
  return await bcrypt.compare(candidatePin, this.documentPin);
};

const User = mongoose.model('User', userSchema);
export default User;
