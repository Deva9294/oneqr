import mongoose from 'mongoose';

const scanLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    qrCode: { type: String, required: true },
    type: {
      type: String,
      enum: ['payment', 'document_view', 'profile_view'],
      required: true,
    },
    // Scanner info
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceType: { type: String },
    browser: { type: String },
    os: { type: String },
    // Location
    location: {
      country: { type: String },
      city: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    // For payments
    amount: { type: Number },
    currency: { type: String, default: 'INR' },
    upiApp: { type: String },
    paymentStatus: {
      type: String,
      enum: ['initiated', 'completed', 'failed', 'cancelled'],
      default: 'initiated',
    },
  },
  { timestamps: true }
);

scanLogSchema.index({ user: 1, createdAt: -1 });
scanLogSchema.index({ qrCode: 1, createdAt: -1 });

const ScanLog = mongoose.model('ScanLog', scanLogSchema);
export default ScanLog;
