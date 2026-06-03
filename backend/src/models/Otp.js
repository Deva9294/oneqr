import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phone: { type: String, required: true },
    code: { type: String, required: true },
    purpose: {
      type: String,
      enum: ['document_download', 'login', 'password_reset', 'phone_verify'],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
