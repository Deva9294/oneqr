import Order from '../models/Order.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

export const createOrder = catchAsync(async (req, res) => {
  const { orderType = 'pvc_card', quantity = 1, shippingAddress } = req.body;

  const pricePerUnit = orderType === 'pvc_card' ? 50 : orderType === 'keychain' ? 10 : 30;
  const totalAmount = pricePerUnit * quantity;

  const order = await Order.create({
    user: req.user._id,
    orderType,
    quantity,
    pricePerUnit,
    totalAmount,
    shippingAddress,
    status: 'pending',
    paymentStatus: 'pending',
  });

  res.status(201).json({ success: true, order });
});

export const getMyOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.json({ success: true, orders });
});

export const getOrderById = catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  res.json({ success: true, order });
});

export const updatePaymentStatus = catchAsync(async (req, res) => {
  const { paymentStatus, paymentId, paymentMethod } = req.body;
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);

  order.paymentStatus = paymentStatus;
  order.paymentId = paymentId;
  order.paymentMethod = paymentMethod;

  if (paymentStatus === 'paid') {
    order.status = 'confirmed';
  }

  await order.save();
  res.json({ success: true, order });
});

export const updateTracking = catchAsync(async (req, res) => {
  const { trackingId, trackingUrl, carrier, status, estimatedDelivery } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  if (trackingId) order.trackingId = trackingId;
  if (trackingUrl) order.trackingUrl = trackingUrl;
  if (carrier) order.carrier = carrier;
  if (status) order.status = status;
  if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
  if (status === 'delivered') order.deliveredAt = new Date();

  await order.save();
  res.json({ success: true, order });
});

// Admin: Get all orders
export const getAllOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .sort('-createdAt')
    .skip((+page - 1) * +limit)
    .limit(+limit);

  const total = await Order.countDocuments(filter);

  res.json({
    success: true,
    orders,
    pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) },
  });
});
