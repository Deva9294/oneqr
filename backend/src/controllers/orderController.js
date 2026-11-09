import Order from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

const PRICE_LIST = Object.freeze({ pvc_card: 50, keychain: 10, premium_sticker: 30 });

export const createOrder = catchAsync(async (req, res) => {
  const { orderType = 'pvc_card', quantity = 1, shippingAddress, paymentMethod = 'cod' } = req.body;
  if (!Object.hasOwn(PRICE_LIST, orderType)) throw new AppError('Invalid product type', 400);
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new AppError('Quantity must be between 1 and 20', 400);
  if (!['cod', 'upi'].includes(paymentMethod)) throw new AppError('Unsupported payment method', 400);
  const requiredAddress = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'];
  if (!shippingAddress || requiredAddress.some((key) => !String(shippingAddress[key] || '').trim())) {
    throw new AppError('Complete shipping address is required', 400);
  }
  if (!/^\d{6}$/.test(String(shippingAddress.pincode))) throw new AppError('Enter a valid 6-digit pincode', 400);
  const pricePerUnit = PRICE_LIST[orderType];
  const order = await Order.create({
    user: req.user._id, orderType, quantity: qty, pricePerUnit,
    totalAmount: pricePerUnit * qty,
    shippingAddress: {
      fullName: String(shippingAddress.fullName).trim().slice(0, 100),
      phone: String(shippingAddress.phone).trim().slice(0, 20),
      line1: String(shippingAddress.line1).trim().slice(0, 200),
      line2: String(shippingAddress.line2 || '').trim().slice(0, 200),
      city: String(shippingAddress.city).trim().slice(0, 80),
      state: String(shippingAddress.state).trim().slice(0, 80),
      pincode: String(shippingAddress.pincode),
    },
    paymentMethod,
    paymentStatus: 'pending',
    status: 'pending',
  });
  res.status(201).json({ success: true, order });
});

export const getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt').limit(100);
  res.json({ success: true, orders });
});

export const getOrderById = catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  res.json({ success: true, order });
});

// Admin-only route: never trust a customer browser to confirm its own payment.
export const updatePaymentStatus = catchAsync(async (req, res) => {
  const { paymentStatus, paymentId, paymentMethod } = req.body;
  if (!['paid', 'failed', 'refunded'].includes(paymentStatus)) throw new AppError('Invalid payment status', 400);
  if (paymentMethod && !['upi', 'card', 'cod'].includes(paymentMethod)) throw new AppError('Invalid payment method', 400);
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (order.paymentStatus === 'refunded' && paymentStatus !== 'refunded') {
    throw new AppError('A refunded order cannot be re-opened through this endpoint', 409);
  }
  order.paymentStatus = paymentStatus;
  if (paymentId) order.paymentId = String(paymentId).slice(0, 120);
  if (paymentMethod) order.paymentMethod = paymentMethod;
  if (paymentStatus === 'paid' && order.status === 'pending') order.status = 'confirmed';
  await order.save();
  res.json({ success: true, order });
});

// Admin-only route for fulfilment and shipment updates.
export const updateTracking = catchAsync(async (req, res) => {
  const { trackingId, trackingUrl, carrier, status, estimatedDelivery } = req.body;
  const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (status && !allowedStatuses.includes(status)) throw new AppError('Invalid order status', 400);
  if (trackingUrl && !/^https:\/\//i.test(trackingUrl)) throw new AppError('Tracking URL must use HTTPS', 400);
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (trackingId !== undefined) order.trackingId = String(trackingId).slice(0, 100);
  if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;
  if (carrier !== undefined) order.carrier = String(carrier).slice(0, 80);
  if (status) order.status = status;
  if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);
  if (status === 'delivered') order.deliveredAt = new Date();
  await order.save();
  res.json({ success: true, order });
});

export const getAllOrders = catchAsync(async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (req.query.status) {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!statuses.includes(req.query.status)) throw new AppError('Invalid order status filter', 400);
    filter.status = req.query.status;
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email phone').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
