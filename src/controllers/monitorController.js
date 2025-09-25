import Monitor from '../models/Monitor.js';
import Alert from '../models/Alert.js';
import Incident from '../models/Incident.js';
import Check from '../models/Check.js';
import { storeCheckResult } from '../services/checkService.js';

// @desc    Get all monitors for user
// @route   GET /api/monitors
// @access  Private
export const getMonitors = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    
    // Build query
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } }
      ];
    }

    const monitors = await Monitor.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Monitor.countDocuments(query);

    res.json({
      success: true,
      data: {
        monitors,
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

// @desc    Get single monitor
// @route   GET /api/monitors/:id
// @access  Private
export const getMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    res.json({
      success: true,
      data: { monitor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new monitor
// @route   POST /api/monitors
// @access  Private
export const createMonitor = async (req, res, next) => {
  try {
    const monitorData = {
      ...req.body,
      user: req.user._id
    };

    const monitor = await Monitor.create(monitorData);

    // Create default alerts for the monitor
    try {
      await createDefaultAlerts(monitor, req.user);
    } catch (alertError) {
      console.error('Failed to create default alerts:', alertError);
      // Don't fail monitor creation if alerts fail
    }

    // Perform initial health check and add to monitoring service
    try {
      const { performHealthCheck, addMonitorToService } = await import('../services/monitoringService.js');
      
      // Perform initial health check
      await performHealthCheck(monitor);
      
      // Add monitor to monitoring service (start scheduled checks)
      addMonitorToService(monitor, req.io);
      
      // Reload monitor to get updated status
      const updatedMonitor = await Monitor.findById(monitor._id);
      
      res.status(201).json({
        success: true,
        message: 'Monitor created successfully',
        data: { monitor: updatedMonitor }
      });
    } catch (healthCheckError) {
      console.error('Initial health check failed:', healthCheckError);
      
      // Still add to monitoring service even if initial check failed
      try {
        const { addMonitorToService } = await import('../services/monitoringService.js');
        addMonitorToService(monitor, req.io);
      } catch (serviceError) {
        console.error('Failed to add monitor to service:', serviceError);
      }
      
      // Still return success but with the monitor as created (with unknown status)
      res.status(201).json({
        success: true,
        message: 'Monitor created successfully (initial check failed)',
        data: { monitor }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update monitor
// @route   PUT /api/monitors/:id
// @access  Private
export const updateMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    res.json({
      success: true,
      message: 'Monitor updated successfully',
      data: { monitor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete monitor
// @route   DELETE /api/monitors/:id
// @access  Private
export const deleteMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Remove from monitoring service
    try {
      const { removeMonitorFromService } = await import('../services/monitoringService.js');
      removeMonitorFromService(monitor._id);
    } catch (serviceError) {
      console.error('Failed to remove monitor from service:', serviceError);
    }

    // Delete associated alerts
    await Alert.deleteMany({ monitor: monitor._id });

    // Delete associated incidents
    await Incident.deleteMany({ monitor: monitor._id });

    res.json({
      success: true,
      message: 'Monitor deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pause/Resume monitor
// @route   PATCH /api/monitors/:id/toggle
// @access  Private
export const toggleMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    const wasActive = monitor.status === 'active';
    monitor.status = wasActive ? 'paused' : 'active';
    await monitor.save();

    // Update monitoring service
    try {
      const { removeMonitorFromService, addMonitorToService } = await import('../services/monitoringService.js');
      
      if (wasActive) {
        // Monitor was active, now paused - remove from service
        removeMonitorFromService(monitor._id);
      } else {
        // Monitor was paused, now active - add to service
        addMonitorToService(monitor, req.io);
      }
    } catch (serviceError) {
      console.error('Failed to update monitor in service:', serviceError);
    }

    res.json({
      success: true,
      message: `Monitor ${monitor.status === 'active' ? 'resumed' : 'paused'} successfully`,
      data: { monitor }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monitor statistics
// @route   GET /api/monitors/:id/stats
// @access  Private
export const getMonitorStats = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Get incidents for the period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const incidents = await Incident.find({
      monitor: monitor._id,
      startedAt: { $gte: startDate }
    }).sort({ startedAt: -1 });

    // Calculate statistics
    const stats = {
      uptime: monitor.uptime,
      totalChecks: monitor.totalChecks,
      successfulChecks: monitor.successfulChecks,
      failedChecks: monitor.failedChecks,
      averageResponseTime: monitor.averageResponseTime,
      lastStatus: monitor.lastStatus,
      lastCheck: monitor.lastCheck,
      lastResponseTime: monitor.lastResponseTime,
      incidents: incidents.length,
      totalDowntime: incidents.reduce((total, incident) => {
        return total + (incident.duration || 0);
      }, 0)
    };

    res.json({
      success: true,
      data: { stats, incidents }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monitor response time chart data
// @route   GET /api/monitors/:id/chart
// @access  Private
export const getMonitorChart = async (req, res, next) => {
  try {
    const { period = '24' } = req.query;
    
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // For now, return mock data
    // In a real implementation, you would query a separate collection
    // that stores historical monitoring data
    const chartData = generateMockChartData(parseInt(period));

    res.json({
      success: true,
      data: { chartData }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test monitor configuration
// @route   POST /api/monitors/test
// @access  Private
export const testMonitor = async (req, res, next) => {
  try {
    const { url, method = 'GET', headers = [], timeout = 30, expectedStatus, body, authentication, monitorId } = req.body;

    // Import monitoring service
    const { performTestCheck } = await import('../services/monitoringService.js');
    
    const result = await performTestCheck({
      url,
      method,
      headers,
      timeout,
      expectedStatus,
      body,
      authentication
    });

    // If monitorId is provided, save the test result as a check
    if (monitorId) {
      try {
        await storeCheckResult({
          monitorId,
          userId: req.user._id,
          status: result.status,
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          error: result.error,
          requestDetails: {
            url,
            method,
            headers,
            body,
            timeout
          }
        });
      } catch (checkError) {
        console.error('Error saving test check result:', checkError);
        // Don't fail the test if we can't save the result
      }
    }

    res.json({
      success: true,
      message: 'Monitor test completed',
      data: { result }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Ping a domain or IP directly
// @route   POST /api/monitors/ping
// @access  Private
export const pingDomain = async (req, res, next) => {
  try {
    const { target, timeout = 5 } = req.body;
    
    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Target domain or IP is required'
      });
    }

    // Import monitoring service with correct import syntax
    const monitoringService = await import('../services/monitoringService.js');
    
    // Directly use the pingServer function
    const pingResult = await monitoringService.pingServer(target, timeout * 1000);
    
    res.json({
      success: true,
      message: pingResult.success ? 'Target is online' : 'Target is offline',
      data: { 
        online: pingResult.success,
        responseTime: pingResult.responseTime,
        output: pingResult.output,
        error: pingResult.error
      }
    });
  } catch (error) {
    console.error('Ping error:', error);
    res.status(500).json({
      success: false,
      message: `Error pinging target: ${error.message}`,
      data: { online: false }
    });
  }
};

// @desc    Get monitor metrics/history
// @route   GET /api/monitors/:id/metrics
// @access  Private
export const getMonitorMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days = 7, limit = 100 } = req.query;

    // Verify monitor belongs to user
    const monitor = await Monitor.findOne({
      _id: id,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Get real metrics data from Check model
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const checks = await Check.find({
      monitor: id,
      timestamp: { $gte: startDate }
    })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

    // Format metrics data for frontend
    const metrics = checks.map(check => ({
      timestamp: check.timestamp.toISOString(),
      responseTime: check.responseTime,
      status: check.status,
      statusCode: check.statusCode,
      error: check.error
    }));

    // Get aggregated statistics
    const stats = await Check.getMonitorStats(id, parseInt(days));

    res.json({
      success: true,
      data: {
        metrics,
        stats,
        monitor: {
          id: monitor._id,
          name: monitor.name,
          url: monitor.url
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create default alerts for a monitor
const createDefaultAlerts = async (monitor, user) => {
  try {
    // Check if user has notification preferences set
    const hasEmailNotifications = user.preferences?.emailNotifications || false;
    const hasWhatsAppNotifications = user.preferences?.whatsappNotifications || false;
    const alertEmail = user.preferences?.alertEmail || user.email;
    const whatsappNumber = user.preferences?.whatsappNumber;

    // Create downtime alert
    const downtimeAlert = {
      user: user._id,
      monitor: monitor._id,
      type: 'downtime',
      name: `${monitor.name} - Downtime Alert`,
      description: `Automatically created alert for when ${monitor.name} goes down`,
      conditions: {
        downtimeThreshold: 1 // Alert immediately when monitor goes down
      },
      channels: {
        email: {
          enabled: hasEmailNotifications,
          recipients: hasEmailNotifications && alertEmail ? [{
            email: alertEmail,
            name: user.name || 'User'
          }] : []
        },
        whatsapp: {
          enabled: hasWhatsAppNotifications,
          recipients: hasWhatsAppNotifications && whatsappNumber ? [{
            phoneNumber: whatsappNumber,
            name: user.name || 'User'
          }] : []
        }
      },
      status: 'active'
    };

    // Create uptime alert
    const uptimeAlert = {
      user: user._id,
      monitor: monitor._id,
      type: 'uptime',
      name: `${monitor.name} - Recovery Alert`,
      description: `Automatically created alert for when ${monitor.name} comes back up`,
      conditions: {
        downtimeThreshold: 1 // Alert when monitor comes back up
      },
      channels: {
        email: {
          enabled: hasEmailNotifications,
          recipients: hasEmailNotifications && alertEmail ? [{
            email: alertEmail,
            name: user.name || 'User'
          }] : []
        },
        whatsapp: {
          enabled: hasWhatsAppNotifications,
          recipients: hasWhatsAppNotifications && whatsappNumber ? [{
            phoneNumber: whatsappNumber,
            name: user.name || 'User'
          }] : []
        }
      },
      status: 'active'
    };

    // Create both alerts
    await Alert.create([downtimeAlert, uptimeAlert]);
    
    console.log(`Created default alerts for monitor: ${monitor.name}`);
  } catch (error) {
    console.error('Error creating default alerts:', error);
    throw error;
  }
};

// Helper function to generate mock chart data
const generateMockChartData = (hours) => {
  const data = [];
  const now = new Date();
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const responseTime = Math.floor(Math.random() * 1000) + 100; // 100-1100ms
    const status = Math.random() > 0.05 ? 'up' : 'down'; // 95% uptime
    
    data.push({
      timestamp: timestamp.toISOString(),
      responseTime,
      status,
      statusCode: status === 'up' ? 200 : 500
    });
  }
  
  return data;
};

// Helper function to generate aggregated chart data for dashboard
const generateAggregatedChartData = (hours, monitors) => {
  const data = [];
  const now = new Date();
  
  // Generate hourly data points
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
    
    // Calculate average response time for this hour
    let totalResponseTime = 0;
    let activeMonitors = 0;
    let upCount = 0;
    
    monitors.forEach(monitor => {
      if (monitor.status === 'active') {
        activeMonitors++;
        // Use current response time as a base, add some variation
        const baseResponseTime = monitor.lastResponseTime || 200;
        const variation = (Math.random() - 0.5) * 100; // ±50ms variation
        const responseTime = Math.max(50, baseResponseTime + variation);
        
        totalResponseTime += responseTime;
        
        // Simulate uptime based on monitor's current status
        if (monitor.lastStatus === 'up' && Math.random() > 0.05) {
          upCount++;
        } else if (monitor.lastStatus === 'down' && Math.random() > 0.3) {
          upCount++;
        }
      }
    });
    
    const averageResponseTime = activeMonitors > 0 ? Math.round(totalResponseTime / activeMonitors) : 0;
    const uptimePercentage = activeMonitors > 0 ? Math.round((upCount / activeMonitors) * 100) : 100;
    
    data.push({
      timestamp: timestamp.toISOString(),
      responseTime: averageResponseTime,
      uptime: uptimePercentage,
      activeMonitors: activeMonitors
    });
  }
  
  return data;
};

// @desc    Get aggregated chart data for dashboard
// @route   GET /api/monitors/dashboard/chart
// @access  Private
export const getDashboardChart = async (req, res, next) => {
  try {
    const { period = '24' } = req.query;
    
    // Get all monitors for the user
    const monitors = await Monitor.find({ user: req.user._id });
    
    if (monitors.length === 0) {
      return res.json({
        success: true,
        data: { chartData: [] }
      });
    }

    // Generate aggregated chart data
    const chartData = generateAggregatedChartData(parseInt(period), monitors);

    res.json({
      success: true,
      data: { chartData }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test email functionality for a monitor
// @route   POST /api/monitors/:id/test-email
// @access  Private
export const testMonitorEmail = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Import email service
    const { sendTestEmail } = await import('../services/emailService.js');
    
    // Send test email
    await sendTestEmail(req.user.email, monitor);

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create default alerts for existing monitors
// @route   POST /api/monitors/create-default-alerts
// @access  Private
export const createDefaultAlertsForAllMonitors = async (req, res, next) => {
  try {
    // Get all monitors for the user
    const monitors = await Monitor.find({ user: req.user._id });
    
    if (monitors.length === 0) {
      return res.json({
        success: true,
        message: 'No monitors found to create alerts for',
        data: { created: 0 }
      });
    }

    let createdCount = 0;
    const errors = [];

    // Create default alerts for each monitor
    for (const monitor of monitors) {
      try {
        // Check if default alerts already exist
        const existingAlerts = await Alert.find({
          monitor: monitor._id,
          type: { $in: ['downtime', 'uptime'] }
        });

        if (existingAlerts.length === 0) {
          await createDefaultAlerts(monitor, req.user);
          createdCount += 2; // 2 alerts per monitor (downtime + uptime)
        }
      } catch (error) {
        console.error(`Error creating alerts for monitor ${monitor.name}:`, error);
        errors.push({
          monitorId: monitor._id,
          monitorName: monitor.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Created default alerts for ${createdCount} alerts across ${monitors.length} monitors`,
      data: {
        created: createdCount,
        monitors: monitors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};
