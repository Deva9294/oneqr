import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updatePaymentStatus,
  updateTracking,
  getAllOrders,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', protect, apiLimiter, createOrder);
router.get('/', protect, getMyOrders);
router.get('/all', protect, getAllOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/payment', protect, updatePaymentStatus);
router.patch('/:id/tracking', protect, updateTracking);

export default router;
