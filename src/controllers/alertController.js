import Alert from '../models/Alert.js';
import Monitor from '../models/Monitor.js';

// @desc    Get all alerts for user
// @route   GET /api/alerts
// @access  Private
export const getAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    // Build query
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }

    const alerts = await Alert.find(query)
      .populate('monitor', 'name url type lastStatus')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single alert
// @route   GET /api/alerts/:id
// @access  Private
export const getAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('monitor', 'name url type lastStatus lastCheck');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: { alert }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new alert
// @route   POST /api/alerts
// @access  Private
export const createAlert = async (req, res, next) => {
  try {
    // Verify monitor belongs to user
    const monitor = await Monitor.findOne({
      _id: req.body.monitor,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    const alertData = {
      ...req.body,
      user: req.user._id
    };

    const alert = await Alert.create(alertData);

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: { alert }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update alert
// @route   PUT /api/alerts/:id
// @access  Private
export const updateAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert updated successfully',
      data: { alert }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private
export const deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle alert status
// @route   PATCH /api/alerts/:id/toggle
// @access  Private
export const toggleAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = alert.status === 'active' ? 'paused' : 'active';
    await alert.save();

    res.json({
      success: true,
      message: `Alert ${alert.status === 'active' ? 'activated' : 'paused'} successfully`,
      data: { alert }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test alert
// @route   POST /api/alerts/:id/test
// @access  Private
export const testAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('monitor');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Trigger test alert
    const alertResult = await alert.trigger(alert.monitor, 'Test alert triggered');

    res.json({
      success: true,
      message: 'Test alert sent successfully',
      data: {
        channels: alertResult.channels,
        message: alertResult.message
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get alert activity/history for user
// @route   GET /api/alerts/activity
// @access  Private
export const getAlertActivity = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    
    // Get all alerts for the user with their history
    const alerts = await Alert.find({ user: req.user._id })
      .populate('monitor', 'name url type')
      .select('name type monitor history lastTriggered triggerCount')
      .sort({ lastTriggered: -1 });

    // Flatten and format the history entries
    const activity = [];
    
    alerts.forEach(alert => {
      if (alert.history && alert.history.length > 0) {
        alert.history.forEach(entry => {
          activity.push({
            id: `${alert._id}-${entry._id}`,
            alertId: alert._id,
            alertName: alert.name,
            alertType: alert.type,
            monitorName: alert.monitor?.name || 'Unknown Monitor',
            monitorUrl: alert.monitor?.url || '',
            type: entry.type, // 'alert', 'escalation', 'resolution'
            message: entry.message,
            channels: entry.channels,
            success: entry.success,
            error: entry.error,
            triggeredAt: entry.triggeredAt,
            timestamp: entry.triggeredAt
          });
        });
      }
    });

    // Sort by timestamp (most recent first) and limit results
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivity = activity.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        activity: limitedActivity,
        total: activity.length
      }
    });
  } catch (error) {
    next(error);
  }
};