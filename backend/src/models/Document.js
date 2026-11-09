import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['aadhaar', 'pan', 'driving_license', 'qualification', 'income', 'caste', 'domicile', 'custom', 'other'], required: true },
  category: { type: String, enum: ['basic', 'sensitive', 'government'], default: 'basic' },
  fileUrl: { type: String, required: true },
  filePublicId: { type: String },
  fileType: { type: String, enum: ['pdf', 'image', 'zip'], required: true },
  fileFormat: { type: String },
  fileSize: { type: Number },
  thumbnailUrl: { type: String },
  isGovernmentFetched: { type: Boolean, default: false },
  governmentSource: { type: String },
  governmentApiRef: { type: String },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  requiresPin: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  downloadCount: { type: Number, default: 0 },
  hasExpiryLink: { type: Boolean, default: false },
  expiryLinkToken: { type: String, index: true },
  expiryLinkExpiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

documentSchema.index({ user: 1, type: 1 });
documentSchema.index({ user: 1, isPublic: 1, isActive: 1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;
