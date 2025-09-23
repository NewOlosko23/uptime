import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Placeholder for user routes
// These would typically include user management, profile updates, etc.
// For now, most user functionality is handled in auth routes

router.get('/profile', (req, res) => {
  res.json({
    success: true,
    data: { user: req.user.getPublicProfile() }
  });
});

export default router;
