import express from 'express';
import {
  uploadDocument, getDocuments, deleteDocument, fetchGovernmentDocument,
  requestDownload, verifyAndDownload, createExpiryLink, accessExpiryLink,
  updateDocumentSharing,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/multer.js';
import { uploadLimiter, apiLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/upload', protect, uploadLimiter, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.patch('/:id/sharing', protect, updateDocumentSharing);
router.delete('/:id', protect, deleteDocument);
router.post('/government/fetch', protect, apiLimiter, fetchGovernmentDocument);

router.post('/:docId/download/request', otpLimiter, requestDownload);
router.post('/:docId/download/verify', otpLimiter, verifyAndDownload);

router.post('/:docId/expiry-link', protect, createExpiryLink);
router.get('/access/:token', accessExpiryLink);

export default router;
