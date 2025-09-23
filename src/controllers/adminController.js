import User from '../models/User.js';
import Monitor from '../models/Monitor.js';
import Alert from '../models/Alert.js';
import Incident from '../models/Incident.js';

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(filter)
      .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID (admin only)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's monitors count
    const monitorsCount = await Monitor.countDocuments({ user: user._id });
    
    // Get user's alerts count
    const alertsCount = await Alert.countDocuments({ user: user._id });

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          monitorsCount,
          alertsCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role (admin only)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "user" or "admin"'
      });
    }

    // Prevent admin from demoting themselves
    if (req.user._id.toString() === req.params.id && role === 'user') {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote yourself from admin role'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `User role updated from ${oldRole} to ${role}`,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (admin only)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'}`,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user subscription (admin only)
// @route   PUT /api/admin/users/:id/subscription
// @access  Private/Admin
export const updateUserSubscription = async (req, res, next) => {
  try {
    const { plan, status } = req.body;

    if (plan && !['free', 'pro', 'business'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Must be "free", "pro", or "business"'
      });
    }

    if (status && !['active', 'canceled', 'past_due', 'unpaid'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active", "canceled", "past_due", or "unpaid"'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (plan) user.subscription.plan = plan;
    if (status) user.subscription.status = status;

    await user.save();

    res.json({
      success: true,
      message: 'User subscription updated',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's monitors, alerts, and incidents
    await Monitor.deleteMany({ user: user._id });
    await Alert.deleteMany({ user: user._id });
    await Incident.deleteMany({ user: user._id });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system statistics (admin only)
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalMonitors,
      activeMonitors,
      totalAlerts,
      recentIncidents,
      usersByPlan
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      Monitor.countDocuments(),
      Monitor.countDocuments({ isActive: true }),
      Alert.countDocuments(),
      Incident.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          admins: adminUsers,
          byPlan: usersByPlan
        },
        monitors: {
          total: totalMonitors,
          active: activeMonitors
        },
        alerts: {
          total: totalAlerts
        },
        incidents: {
          recent: recentIncidents
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote user to admin (admin only)
// @route   POST /api/admin/users/:id/promote
// @access  Private/Admin
export const promoteUserToAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin'
      });
    }

    user.role = 'admin';
    await user.save();

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Demote admin to user (admin only)
// @route   POST /api/admin/users/:id/demote
// @access  Private/Admin
export const demoteAdminToUser = async (req, res, next) => {
  try {
    // Prevent admin from demoting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot demote yourself from admin role'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'user') {
      return res.status(400).json({
        success: false,
        message: 'User is already a regular user'
      });
    }

    user.role = 'user';
    await user.save();

    res.json({
      success: true,
      message: 'Admin demoted to user successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform settings (admin only)
// @route   GET /api/admin/platform/settings
// @access  Private/Admin
export const getPlatformSettings = async (req, res, next) => {
  try {
    // Default platform settings
    const settings = {
      siteName: 'Avodal Uptime',
      siteDescription: 'Professional uptime monitoring service',
      maintenanceMode: false,
      registrationEnabled: true,
      emailNotifications: true,
      maxMonitorsPerUser: {
        free: 3,
        pro: 25,
        business: 100
      },
      checkIntervals: {
        free: 300, // 5 minutes
        pro: 60,   // 1 minute
        business: 30 // 30 seconds
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update platform settings (admin only)
// @route   PUT /api/admin/platform/settings
// @access  Private/Admin
export const updatePlatformSettings = async (req, res, next) => {
  try {
    const {
      siteName,
      siteDescription,
      maintenanceMode,
      registrationEnabled,
      emailNotifications,
      maxMonitorsPerUser,
      checkIntervals
    } = req.body;

    // Validate the settings
    const settings = {
      siteName: siteName || 'Avodal Uptime',
      siteDescription: siteDescription || 'Professional uptime monitoring service',
      maintenanceMode: Boolean(maintenanceMode),
      registrationEnabled: Boolean(registrationEnabled),
      emailNotifications: Boolean(emailNotifications),
      maxMonitorsPerUser: {
        free: parseInt(maxMonitorsPerUser?.free) || 3,
        pro: parseInt(maxMonitorsPerUser?.pro) || 25,
        business: parseInt(maxMonitorsPerUser?.business) || 100
      },
      checkIntervals: {
        free: parseInt(checkIntervals?.free) || 300,
        pro: parseInt(checkIntervals?.pro) || 60,
        business: parseInt(checkIntervals?.business) || 30
      }
    };

    // In a real application, you would save these to a database
    // For now, we'll just return the validated settings
    res.json({
      success: true,
      message: 'Platform settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all monitors (admin only)
// @route   GET /api/admin/monitors
// @access  Private/Admin
export const getAllMonitors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.user) {
      filter.user = req.query.user;
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { url: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const monitors = await Monitor.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Monitor.countDocuments(filter);

    res.json({
      success: true,
      data: {
        monitors,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get plan statistics (admin only)
// @route   GET /api/admin/plans/stats
// @access  Private/Admin
export const getPlanStats = async (req, res, next) => {
  try {
    // Get user counts by plan
    const usersByPlan = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format
    const planStats = {
      free: 0,
      pro: 0,
      business: 0
    };

    usersByPlan.forEach(plan => {
      if (planStats.hasOwnProperty(plan._id)) {
        planStats[plan._id] = plan.count;
      }
    });

    res.json({
      success: true,
      data: planStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update plan configuration (admin only)
// @route   PUT /api/admin/plans/:id
// @access  Private/Admin
export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, limits, features, active } = req.body;

    // Validate plan ID
    if (!['free', 'pro', 'business'].includes(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan ID. Must be "free", "pro", or "business"'
      });
    }

    // For now, we'll return the updated plan data
    // In a real application, you would save this to a database
    const updatedPlan = {
      id,
      name: name || (id === 'free' ? 'Free' : id === 'pro' ? 'Pro' : 'Business'),
      price: price !== undefined ? parseFloat(price) : (id === 'free' ? 0 : id === 'pro' ? 9.99 : 29.99),
      features: features || [],
      limits: {
        monitors: limits?.monitors || (id === 'free' ? 3 : id === 'pro' ? 25 : 100),
        checkInterval: limits?.checkInterval || (id === 'free' ? 300 : id === 'pro' ? 60 : 30),
        retention: limits?.retention || (id === 'free' ? 30 : id === 'pro' ? 90 : 365)
      },
      active: active !== undefined ? Boolean(active) : true
    };

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: updatedPlan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update monitor status (admin only)
// @route   PUT /api/admin/monitors/:id/status
// @access  Private/Admin
export const updateMonitorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "active" or "paused"'
      });
    }

    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    monitor.status = status;
    await monitor.save();

    res.json({
      success: true,
      message: `Monitor ${status === 'active' ? 'activated' : 'paused'} successfully`,
      data: {
        monitor
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete monitor (admin only)
// @route   DELETE /api/admin/monitors/:id
// @access  Private/Admin
export const deleteMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Delete associated alerts and incidents
    await Alert.deleteMany({ monitor: monitor._id });
    await Incident.deleteMany({ monitor: monitor._id });

    // Delete the monitor
    await Monitor.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Monitor and all associated data deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};