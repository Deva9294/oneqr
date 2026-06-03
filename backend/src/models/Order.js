import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderType: {
      type: String,
      enum: ['pvc_card', 'premium_sticker', 'keychain'],
      default: 'pvc_card',
    },
    quantity: { type: Number, default: 1 },
    pricePerUnit: { type: Number, default: 50 },
    totalAmount: { type: Number, required: true },

    // Shipping
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String, enum: ['upi', 'card', 'cod'] },
    paymentId: { type: String },

    // Tracking
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    trackingId: { type: String },
    trackingUrl: { type: String },
    carrier: { type: String },

    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },

    notes: { type: String },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
