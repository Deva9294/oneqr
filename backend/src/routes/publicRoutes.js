import express from 'express';
import { getPublicDocuments, getPublicProfile, getPublicStats } from '../controllers/publicController.js';

const router = express.Router();

router.get('/documents/:qrCode', getPublicDocuments);
router.get('/profile/:qrCode', getPublicProfile);
router.get('/stats', getPublicStats);

export default router;
