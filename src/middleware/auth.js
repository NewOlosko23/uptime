import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated.'
        });
      }

      // Check if role has changed since token was issued
      if (decoded.role && decoded.role !== user.role) {
        return res.status(401).json({
          success: false,
          message: 'User role has changed. Please login again.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route.`
      });
    }
    next();
  };
};

// Check if user has active subscription
export const requireSubscription = (req, res, next) => {
  if (req.user.subscription.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Active subscription required to access this feature.'
    });
  }
  next();
};

// Check if user can create more monitors
export const checkMonitorLimit = async (req, res, next) => {
  try {
    const Monitor = (await import('../models/Monitor.js')).default;
    const userMonitors = await Monitor.countDocuments({ user: req.user._id });
    
    const planLimits = {
      free: 3,
      pro: 25,
      business: 100
    };
    
    const limit = planLimits[req.user.subscription.plan];
    
    if (userMonitors >= limit) {
      return res.status(403).json({
        success: false,
        message: `Monitor limit reached for ${req.user.subscription.plan} plan. Upgrade to create more monitors.`,
        currentCount: userMonitors,
        limit: limit
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking monitor limit.'
    });
  }
};

// Check if user has advanced features
export const requireAdvancedFeatures = (req, res, next) => {
  const advancedPlans = ['pro', 'business'];
  
  if (!advancedPlans.includes(req.user.subscription.plan)) {
    return res.status(403).json({
      success: false,
      message: 'Advanced features require Pro or Business plan.'
    });
  }
  next();
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    next();
  }
};
