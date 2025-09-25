import express from 'express';
import {
  getMonitors,
  getMonitor,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
  getMonitorStats,
  getMonitorChart,
  getDashboardChart,
  testMonitor,
  getMonitorMetrics,
  testMonitorEmail,
  createDefaultAlertsForAllMonitors,
  pingDomain
} from '../controllers/monitorController.js';
import { protect, checkMonitorLimit } from '../middleware/auth.js';
import {
  validateMonitor,
  validateMonitorUpdate,
  validateObjectId,
  validatePagination
} from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/', validatePagination, getMonitors);
router.get('/dashboard/chart', getDashboardChart);
router.post('/', checkMonitorLimit, validateMonitor, createMonitor);
router.post('/test', testMonitor);
router.post('/ping', pingDomain);
router.post('/create-default-alerts', createDefaultAlertsForAllMonitors);
router.get('/:id', validateObjectId('id'), getMonitor);
router.put('/:id', validateObjectId('id'), validateMonitorUpdate, updateMonitor);
router.delete('/:id', validateObjectId('id'), deleteMonitor);
router.patch('/:id/toggle', validateObjectId('id'), toggleMonitor);
router.get('/:id/stats', validateObjectId('id'), getMonitorStats);
router.get('/:id/chart', validateObjectId('id'), getMonitorChart);
router.get('/:id/metrics', validateObjectId('id'), getMonitorMetrics);
router.post('/:id/test-email', validateObjectId('id'), testMonitorEmail);

export default router;
