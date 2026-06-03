import express from 'express';
import { register, login, getMe, updateProfile, updatePassword, updatePin, updateUPI } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', apiLimiter, register);
router.post('/login', apiLimiter, login);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.patch('/password', protect, updatePassword);
router.patch('/pin', protect, updatePin);
router.patch('/upi', protect, updateUPI);

export default router;
