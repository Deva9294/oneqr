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

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 8, select: false },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  qrCode: { type: String, required: true, unique: true },
  qrCodeImage: { type: String, required: true },
  upiId: { type: String, required: true },
  upiDeepLink: { type: String },
  documentPin: { type: String, required: true, minlength: 4, maxlength: 60, select: false },
  isPinVerified: { type: Boolean, default: false },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  emergencyContacts: [emergencyContactSchema],
  medicalConditions: [{ type: String }],
  profiles: [profileSchema],
  activeProfile: { type: String, enum: ['personal', 'business'], default: 'personal' },
  totalScans: { type: Number, default: 0 },
  totalDownloads: { type: Number, default: 0 },
  totalPayments: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  aadhaarNumber: { type: String, select: false },
  panNumber: { type: String, select: false },
  dlNumber: { type: String, select: false },
  kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
  if (this.isModified('documentPin')) this.documentPin = await bcrypt.hash(this.documentPin, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
userSchema.methods.comparePin = function (candidatePin) {
  return bcrypt.compare(candidatePin, this.documentPin);
};

const User = mongoose.model('User', userSchema);
export default User;
