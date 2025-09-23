import Alert from '../models/Alert.js';
import Monitor from '../models/Monitor.js';
import { testEmailProvider, getEmailProviderInfo } from '../services/emailService.js';
import { testWhatsAppProvider, getWhatsAppProviderInfo } from '../services/whatsappService.js';

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

    // Auto-populate channels from user preferences if not provided
    const alertData = {
      ...req.body,
      user: req.user._id
    };

    // If channels are not provided, populate from user preferences
    if (!alertData.channels) {
      alertData.channels = {
        email: {
          enabled: req.user.preferences?.emailNotifications || false,
          recipients: []
        },
        whatsapp: {
          enabled: req.user.preferences?.whatsappNotifications || false,
          recipients: []
        }
      };

      // Add email recipient if email notifications are enabled
      if (alertData.channels.email.enabled && req.user.preferences?.alertEmail) {
        alertData.channels.email.recipients.push({
          email: req.user.preferences.alertEmail,
          name: req.user.name
        });
      }

      // Add WhatsApp recipient if WhatsApp notifications are enabled
      if (alertData.channels.whatsapp.enabled && req.user.preferences?.whatsappNumber) {
        alertData.channels.whatsapp.recipients.push({
          phoneNumber: req.user.preferences.whatsappNumber,
          name: req.user.name
        });
      }
    }

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

    // Send test notifications
    const promises = [];

    // Prioritize WhatsApp over email for testing
    if (alertResult.channels.includes('whatsapp')) {
      const { sendTestWhatsApp } = await import('../services/whatsappService.js');
      // Send test to first WhatsApp recipient
      if (alert.channels.whatsapp.recipients.length > 0) {
        promises.push(sendTestWhatsApp(alert.channels.whatsapp.recipients[0].phoneNumber, alert.monitor));
      }
    } else if (alertResult.channels.includes('email')) {
      const { sendTestEmail } = await import('../services/emailService.js');
      // Use user's alert email preference or fallback to account email
      const testEmail = req.user.preferences?.alertEmail || req.user.email;
      promises.push(sendTestEmail(testEmail, alert.monitor));
    }

    await Promise.allSettled(promises);

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

// @desc    Test email provider
// @route   POST /api/alerts/test-email
// @access  Private
export const testEmailProviderEndpoint = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const result = await testEmailProvider(email);
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Test email sent successfully via ${result.provider.toUpperCase()}`
        : `Failed to send test email via ${result.provider.toUpperCase()}: ${result.error}`,
      data: {
        provider: result.provider,
        result: result.result
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test WhatsApp provider
// @route   POST /api/alerts/test-whatsapp
// @access  Private
export const testWhatsAppProviderEndpoint = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format (without + as WhatsApp API expects it)
    const phoneRegex = /^[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number without + sign (e.g., 1234567890)'
      });
    }

    const result = await testWhatsAppProvider(phoneNumber);
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Test WhatsApp message sent successfully to ${phoneNumber}`
        : `Failed to send test WhatsApp message: ${result.error}`,
      data: {
        provider: result.provider,
        phoneNumber: phoneNumber,
        result: result.result
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get email provider info
// @route   GET /api/alerts/email-provider
// @access  Private
export const getEmailProviderInfoEndpoint = async (req, res, next) => {
  try {
    const info = getEmailProviderInfo();
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get WhatsApp provider info
// @route   GET /api/alerts/whatsapp-provider
// @access  Private
export const getWhatsAppProviderInfoEndpoint = async (req, res, next) => {
  try {
    const info = getWhatsAppProviderInfo();
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync alerts with user preferences
// @route   POST /api/alerts/sync-preferences
// @access  Private
export const syncAlertsWithPreferences = async (req, res, next) => {
  try {
    // Get all active alerts for the user
    const alerts = await Alert.find({
      user: req.user._id,
      status: 'active'
    });

    let updatedCount = 0;

    // Update each alert with current user preferences
    for (const alert of alerts) {
      let needsUpdate = false;
      const updateData = {};

      // Update email channel
      if (req.user.preferences?.emailNotifications !== undefined) {
        if (alert.channels.email.enabled !== req.user.preferences.emailNotifications) {
          updateData['channels.email.enabled'] = req.user.preferences.emailNotifications;
          needsUpdate = true;
        }

        // Update email recipients
        if (req.user.preferences.alertEmail) {
          const hasCorrectEmail = alert.channels.email.recipients.some(
            recipient => recipient.email === req.user.preferences.alertEmail
          );
          
          if (!hasCorrectEmail) {
            updateData['channels.email.recipients'] = [{
              email: req.user.preferences.alertEmail,
              name: req.user.name
            }];
            needsUpdate = true;
          }
        }
      }

      // Update WhatsApp channel
      if (req.user.preferences?.whatsappNotifications !== undefined) {
        if (alert.channels.whatsapp.enabled !== req.user.preferences.whatsappNotifications) {
          updateData['channels.whatsapp.enabled'] = req.user.preferences.whatsappNotifications;
          needsUpdate = true;
        }

        // Update WhatsApp recipients
        if (req.user.preferences.whatsappNumber) {
          const hasCorrectNumber = alert.channels.whatsapp.recipients.some(
            recipient => recipient.phoneNumber === req.user.preferences.whatsappNumber
          );
          
          if (!hasCorrectNumber) {
            updateData['channels.whatsapp.recipients'] = [{
              phoneNumber: req.user.preferences.whatsappNumber,
              name: req.user.name
            }];
            needsUpdate = true;
          }
        }
      }

      // Apply updates if needed
      if (needsUpdate) {
        await Alert.findByIdAndUpdate(alert._id, { $set: updateData });
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${updatedCount} alerts with your preferences`,
      data: {
        totalAlerts: alerts.length,
        updatedAlerts: updatedCount
      }
    });
  } catch (error) {
    next(error);
  }
};