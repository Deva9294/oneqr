import mongoose from 'mongoose';

const expiryLinkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
    usedByIp: { type: String },
  },
  { timestamps: true }
);

expiryLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ExpiryLink = mongoose.model('ExpiryLink', expiryLinkSchema);
export default ExpiryLink;
