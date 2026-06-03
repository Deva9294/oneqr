import express from 'express';
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  fetchGovernmentDocument,
  requestDownload,
  verifyAndDownload,
  createExpiryLink,
  accessExpiryLink,
} from '../controllers/documentController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/multer.js';
import { uploadLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/upload', protect, uploadLimiter, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.delete('/:id', protect, deleteDocument);
router.post('/government/fetch', protect, apiLimiter, fetchGovernmentDocument);

// Public secure download endpoints
router.post('/:docId/download/request', apiLimiter, requestDownload);
router.post('/:docId/download/verify', apiLimiter, verifyAndDownload);

// Expiry link
router.post('/:docId/expiry-link', protect, createExpiryLink);
router.get('/access/:token', accessExpiryLink);

export default router;
