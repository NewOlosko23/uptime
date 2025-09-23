import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation middleware
const validatePreferences = [
  body('preferences.emailNotifications').optional().isBoolean(),
  body('preferences.whatsappNotifications').optional().isBoolean(),
  body('preferences.alertEmail').optional().isEmail().normalizeEmail(),
  body('preferences.whatsappNumber').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Please provide a valid WhatsApp number in international format (e.g., +1234567890)'),
  body('preferences.timezone').optional().isString(),
  body('preferences.theme').optional().isIn(['light', 'dark', 'auto'])
];

// Get user profile
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    data: { user: req.user.getPublicProfile() }
  });
});

// Update user preferences
router.put('/preferences', validatePreferences, async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { preferences } = req.body;
    
    // Update user preferences
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $set: { 
          preferences: { 
            ...req.user.preferences, 
            ...preferences 
          } 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { user: updatedUser.getPublicProfile() }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile (name, email, etc.)
router.put('/profile', [
  body('name').optional().isLength({ min: 1, max: 50 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Please provide a valid phone number')
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser.getPublicProfile() }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
