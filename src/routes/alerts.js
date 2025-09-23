import express from 'express';
import {
  getAlerts,
  getAlert,
  createAlert,
  updateAlert,
  deleteAlert,
  toggleAlert,
  testAlert,
  getAlertActivity,
  testEmailProviderEndpoint,
  getEmailProviderInfoEndpoint,
  testWhatsAppProviderEndpoint,
  getWhatsAppProviderInfoEndpoint,
  syncAlertsWithPreferences
} from '../controllers/alertController.js';
import { protect } from '../middleware/auth.js';
import {
  validateAlert,
  validateObjectId,
  validatePagination
} from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/', validatePagination, getAlerts);
router.get('/activity', getAlertActivity);
router.get('/email-provider', getEmailProviderInfoEndpoint);
router.get('/whatsapp-provider', getWhatsAppProviderInfoEndpoint);
router.post('/', validateAlert, createAlert);
router.post('/test-email', testEmailProviderEndpoint);
router.post('/test-whatsapp', testWhatsAppProviderEndpoint);
router.post('/sync-preferences', syncAlertsWithPreferences);
router.get('/:id', validateObjectId('id'), getAlert);
router.put('/:id', validateObjectId('id'), updateAlert);
router.delete('/:id', validateObjectId('id'), deleteAlert);
router.patch('/:id/toggle', validateObjectId('id'), toggleAlert);
router.post('/:id/test', validateObjectId('id'), testAlert);

export default router;
