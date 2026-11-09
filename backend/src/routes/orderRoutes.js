import express from 'express';
import {
  createOrder, getMyOrders, getOrderById, updatePaymentStatus, updateTracking, getAllOrders,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', protect, apiLimiter, createOrder);
router.get('/', protect, getMyOrders);
router.get('/all', protect, requireAdmin, getAllOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/payment', protect, requireAdmin, updatePaymentStatus);
router.patch('/:id/tracking', protect, requireAdmin, updateTracking);

export default router;
