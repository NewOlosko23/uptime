import express from 'express';
import {
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
  addIncidentUpdate,
  resolveIncident,
  getActiveIncidents
} from '../controllers/incidentController.js';
import { protect } from '../middleware/auth.js';
import {
  validateObjectId,
  validatePagination
} from '../middleware/validation.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.get('/', validatePagination, getIncidents);
router.get('/active', getActiveIncidents);
router.post('/', createIncident);
router.get('/:id', validateObjectId('id'), getIncident);
router.put('/:id', validateObjectId('id'), updateIncident);
router.post('/:id/updates', validateObjectId('id'), addIncidentUpdate);
router.patch('/:id/resolve', validateObjectId('id'), resolveIncident);

export default router;
