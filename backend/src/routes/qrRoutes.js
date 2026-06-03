import express from 'express';
import { handleScan, redirectScan, getUPIIntent } from '../controllers/qrController.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/:qrCode/scan', apiLimiter, handleScan);
router.get('/redirect/:qrCode', redirectScan);
router.get('/:qrCode/upi-intent', apiLimiter, getUPIIntent);

export default router;
