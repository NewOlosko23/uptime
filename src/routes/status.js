import express from 'express';
import {
  getStatusPages,
  getStatusPage,
  createStatusPage,
  updateStatusPage,
  deleteStatusPage,
  getPublicStatusPage,
  subscribeToStatusPage,
  unsubscribeFromStatusPage
} from '../controllers/statusController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import {
  validateStatusPage,
  validateObjectId,
  validatePagination
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.get('/public/:slug', getPublicStatusPage);
router.post('/:slug/subscribe', subscribeToStatusPage);
router.post('/:slug/unsubscribe', unsubscribeFromStatusPage);

// Protected routes
router.use(protect);

router.get('/', validatePagination, getStatusPages);
router.post('/', validateStatusPage, createStatusPage);
router.get('/:id', validateObjectId('id'), getStatusPage);
router.put('/:id', validateObjectId('id'), updateStatusPage);
router.delete('/:id', validateObjectId('id'), deleteStatusPage);

export default router;
