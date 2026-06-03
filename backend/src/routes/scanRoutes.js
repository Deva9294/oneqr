import express from 'express';
import { getScanAnalytics, getRecentScans } from '../controllers/scanController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/analytics', protect, getScanAnalytics);
router.get('/recent', protect, getRecentScans);

export default router;
