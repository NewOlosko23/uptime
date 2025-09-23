import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  updateUserSubscription,
  deleteUser,
  getSystemStats,
  promoteUserToAdmin,
  demoteAdminToUser,
  getPlatformSettings,
  updatePlatformSettings,
  getAllMonitors,
  updateMonitorStatus,
  deleteMonitor,
  getPlanStats,
  updatePlan
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// User management routes
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .get(getUserById)
  .delete(deleteUser);

router.route('/users/:id/role')
  .put(updateUserRole);

router.route('/users/:id/status')
  .put(updateUserStatus);

router.route('/users/:id/subscription')
  .put(updateUserSubscription);

router.route('/users/:id/promote')
  .post(promoteUserToAdmin);

router.route('/users/:id/demote')
  .post(demoteAdminToUser);

// System statistics
router.route('/stats')
  .get(getSystemStats);

// Platform settings
router.route('/platform/settings')
  .get(getPlatformSettings)
  .put(updatePlatformSettings);

// Plan management routes
router.route('/plans/stats')
  .get(getPlanStats);

router.route('/plans/:id')
  .put(updatePlan);

// Monitor management routes
router.route('/monitors')
  .get(getAllMonitors);

router.route('/monitors/:id/status')
  .put(updateMonitorStatus);

router.route('/monitors/:id')
  .delete(deleteMonitor);

export default router;
