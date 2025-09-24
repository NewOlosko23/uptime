import axios from 'axios';
import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import Monitor from '../models/Monitor.js';
import Alert from '../models/Alert.js';
import Incident from '../models/Incident.js';
import { sendMonitorAlert } from './emailService.js';
import { storeCheckResult } from './checkService.js';

const execAsync = promisify(exec);

// Store active monitoring jobs
const monitoringJobs = new Map();

// Enhanced ping function for server monitoring with better error handling and fallbacks
const pingServer = async (host, timeout = 5000) => {
  const startTime = Date.now();
  
  try {
    // Extract hostname/IP from URL if needed
    let targetHost = host;
    if (host.startsWith('http://') || host.startsWith('https://')) {
      const url = new URL(host);
      targetHost = url.hostname;
    }
    
    // Validate host format
    if (!targetHost || targetHost.trim() === '') {
      throw new Error('Invalid host: empty or null hostname');
    }
    
    // Clean hostname (remove any invalid characters)
    targetHost = targetHost.trim().replace(/[<>|&$`\\]/g, '');
    
    // Use ping command based on OS with improved parameters
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';
    
    let pingCommand;
    if (isWindows) {
      // Windows: -n (count), -w (timeout in ms), -l (packet size)
      pingCommand = `ping -n 1 -w ${timeout} -l 32 "${targetHost}"`;
    } else if (isMac) {
      // macOS: -c (count), -W (timeout in seconds), -s (packet size)
      pingCommand = `ping -c 1 -W ${Math.ceil(timeout / 1000)} -s 32 "${targetHost}"`;
    } else {
      // Linux: -c (count), -W (timeout in seconds), -s (packet size)
      pingCommand = `ping -c 1 -W ${Math.ceil(timeout / 1000)} -s 32 "${targetHost}"`;
    }
    
    console.log(`[PING] Executing: ${pingCommand}`);
    
    const { stdout, stderr } = await execAsync(pingCommand);
    const responseTime = Date.now() - startTime;
    
    // Enhanced success detection based on OS
    let isSuccess = false;
    let actualResponseTime = responseTime;
    
    if (isWindows) {
      // Windows success indicators
      isSuccess = stdout.includes('Reply from') && 
                  !stdout.includes('Request timed out') &&
                  !stdout.includes('Destination host unreachable') &&
                  !stdout.includes('General failure');
      
      // Extract actual ping time from Windows output
      const timeMatch = stdout.match(/time[<=](\d+)ms/i);
      if (timeMatch) {
        actualResponseTime = parseInt(timeMatch[1]);
      }
    } else {
      // Unix/Linux/macOS success indicators
      isSuccess = (stdout.includes('1 received') || stdout.includes('1 packets transmitted, 1 received')) &&
                  !stderr &&
                  !stdout.includes('100% packet loss') &&
                  !stdout.includes('Network is unreachable');
      
      // Extract actual ping time from Unix output
      const timeMatch = stdout.match(/time=(\d+(?:\.\d+)?)/i);
      if (timeMatch) {
        actualResponseTime = parseFloat(timeMatch[1]);
      }
    }
    
    // Additional validation for common failure patterns
    if (stdout.includes('Name or service not known') || 
        stdout.includes('Temporary failure in name resolution') ||
        stdout.includes('ping: cannot resolve')) {
      isSuccess = false;
    }
    
    const result = {
      success: isSuccess,
      responseTime: actualResponseTime,
      output: stdout,
      error: isSuccess ? null : (stderr || 'Ping failed - no response received')
    };
    
    console.log(`[PING] ${targetHost}: ${isSuccess ? 'SUCCESS' : 'FAILED'} (${actualResponseTime}ms)`);
    
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error.message || 'Unknown ping error';
    
    console.log(`[PING] ${host}: ERROR - ${errorMessage}`);
    
    // Fallback: Try HTTP ping for server endpoints
    if (host.startsWith('http://') || host.startsWith('https://')) {
      console.log(`[PING] Attempting HTTP fallback for ${host}`);
      try {
        const fallbackResult = await axios.head(host, { 
          timeout: Math.min(timeout, 5000),
          validateStatus: () => true // Accept any status code
        });
        
        return {
          success: true,
          responseTime: Date.now() - startTime,
          output: `HTTP fallback successful: ${fallbackResult.status}`,
          error: null
        };
      } catch (fallbackError) {
        console.log(`[PING] HTTP fallback also failed: ${fallbackError.message}`);
      }
    }
    
    return {
      success: false,
      responseTime,
      output: '',
      error: errorMessage
    };
  }
};

// Start monitoring service
export const startMonitoringService = (io) => {
  console.log('Starting monitoring service...');
  
  // Load all active monitors
  loadActiveMonitors(io);
  
  // Schedule periodic cleanup and reload
  cron.schedule('*/5 * * * *', () => {
    cleanupCompletedIncidents();
  });
  
  cron.schedule('0 */6 * * *', () => {
    loadActiveMonitors(io);
  });
};

// Load all active monitors and start monitoring
const loadActiveMonitors = async (io) => {
  try {
    const monitors = await Monitor.find({ status: 'active' });
    
    for (const monitor of monitors) {
      if (!monitoringJobs.has(monitor._id.toString())) {
        startMonitoringJob(monitor, io);
      }
    }
    
    console.log(`Loaded ${monitors.length} active monitors`);
  } catch (error) {
    console.error('Error loading monitors:', error);
  }
};

// Start monitoring job for a specific monitor
const startMonitoringJob = (monitor, io) => {
  const jobId = monitor._id.toString();
  
  // Create cron expression based on monitoring interval
  const cronExpression = getCronExpression(monitor.monitoringInterval);
  
  const job = cron.schedule(cronExpression, async () => {
    try {
      await performHealthCheck(monitor, io);
    } catch (error) {
      console.error(`Error monitoring ${monitor.name}:`, error);
    }
  }, {
    scheduled: false
  });
  
  monitoringJobs.set(jobId, job);
  job.start();
  
  console.log(`Started monitoring job for ${monitor.name} (${monitor.monitoringInterval}s interval)`);
};

// Stop monitoring job for a specific monitor
const stopMonitoringJob = (monitorId) => {
  const jobId = monitorId.toString();
  const job = monitoringJobs.get(jobId);
  
  if (job) {
    job.stop();
    monitoringJobs.delete(jobId);
    console.log(`Stopped monitoring job for monitor ${monitorId}`);
  }
};

// Get cron expression from interval in seconds
const getCronExpression = (intervalSeconds) => {
  if (intervalSeconds < 60) {
    // Less than a minute - use seconds
    return `*/${intervalSeconds} * * * * *`;
  } else if (intervalSeconds < 3600) {
    // Less than an hour - use minutes
    const minutes = Math.floor(intervalSeconds / 60);
    return `*/${minutes} * * * *`;
  } else {
    // An hour or more - use hours
    const hours = Math.floor(intervalSeconds / 3600);
    return `0 */${hours} * * *`;
  }
};

// Perform test check for monitor configuration (without saving to database)
export const performTestCheck = async (testConfig) => {
  const startTime = Date.now();
  let result = {
    success: false,
    responseTime: 0,
    statusCode: 0,
    status: 'down',
    error: null,
    timestamp: new Date()
  };

  try {
    // Handle different monitor types
    if (testConfig.type === 'server') {
      // Use ping for server monitoring
      const pingResult = await pingServer(testConfig.url, testConfig.timeout * 1000);
      
      result = {
        success: pingResult.success,
        responseTime: pingResult.responseTime,
        statusCode: pingResult.success ? 200 : 0,
        status: pingResult.success ? 'up' : 'down',
        error: pingResult.error,
        timestamp: new Date()
      };
      
      // Check if response time meets expectations
      if (testConfig.expectedResponseTime && pingResult.responseTime > testConfig.expectedResponseTime) {
        result.success = false;
        result.status = 'down';
        result.error = `Response time ${pingResult.responseTime}ms exceeds expected ${testConfig.expectedResponseTime}ms`;
      }
      
    } else {
      // Enhanced HTTP monitoring for website/api types
      const config = {
        method: testConfig.method.toLowerCase(),
        url: testConfig.url,
        timeout: testConfig.timeout * 1000,
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        headers: {
          'User-Agent': 'Avodal-Uptime-Monitor/1.0',
          'Accept': '*/*',
          'Connection': 'close'
        },
        maxRedirects: 5, // Allow up to 5 redirects
        followRedirect: true
      };

      // Add custom headers
      if (testConfig.headers && testConfig.headers.length > 0) {
        testConfig.headers.forEach(header => {
          if (header.name && header.value) {
            config.headers[header.name] = header.value;
          }
        });
      }

      // Add authentication
      if (testConfig.authentication && testConfig.authentication.type === 'basic' && testConfig.authentication.username) {
        const auth = Buffer.from(
          `${testConfig.authentication.username}:${testConfig.authentication.password || ''}`
        ).toString('base64');
        config.headers.Authorization = `Basic ${auth}`;
      } else if (testConfig.authentication && testConfig.authentication.type === 'bearer' && testConfig.authentication.token) {
        config.headers.Authorization = `Bearer ${testConfig.authentication.token}`;
      }

      // Add request body for POST/PUT requests
      if (testConfig.body && ['post', 'put', 'patch'].includes(testConfig.method.toLowerCase())) {
        config.data = testConfig.body;
        // Set content-type if not already set
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }

      console.log(`[HTTP] Testing ${testConfig.method} ${testConfig.url}`);

      // Perform the request
      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      result = {
        success: true,
        responseTime,
        statusCode: response.status,
        status: 'up',
        error: null,
        timestamp: new Date()
      };

      console.log(`[HTTP] ${testConfig.url}: ${response.status} (${responseTime}ms)`);

      // Check if response meets expectations
      if (testConfig.expectedStatus && response.status !== testConfig.expectedStatus) {
        result.success = false;
        result.status = 'down';
        result.error = `Expected status ${testConfig.expectedStatus}, got ${response.status}`;
      }

      if (testConfig.expectedResponseTime && responseTime > testConfig.expectedResponseTime) {
        result.success = false;
        result.status = 'down';
        result.error = `Response time ${responseTime}ms exceeds expected ${testConfig.expectedResponseTime}ms`;
      }
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    result = {
      success: false,
      responseTime,
      statusCode: error.response?.status || 0,
      status: 'down',
      error: error.message,
      timestamp: new Date()
    };
  }

  return result;
};

// Perform health check for a monitor
export const performHealthCheck = async (monitor, io = null) => {
  const startTime = Date.now();
  let result = {
    success: false,
    responseTime: 0,
    statusCode: 0,
    status: 'down',
    error: null,
    timestamp: new Date()
  };

  try {
    // Handle different monitor types
    if (monitor.type === 'server') {
      // Use ping for server monitoring
      const pingResult = await pingServer(monitor.url, monitor.timeout * 1000);
      
      result = {
        success: pingResult.success,
        responseTime: pingResult.responseTime,
        statusCode: pingResult.success ? 200 : 0,
        status: pingResult.success ? 'up' : 'down',
        error: pingResult.error,
        timestamp: new Date()
      };
      
      // Check if response time meets expectations
      if (monitor.expectedResponseTime && pingResult.responseTime > monitor.expectedResponseTime) {
        result.success = false;
        result.status = 'down';
        result.error = `Response time ${pingResult.responseTime}ms exceeds expected ${monitor.expectedResponseTime}ms`;
      }
      
    } else if (monitor.type === 'port') {
      // For port monitoring, we'll use a simple TCP connection test
      // This is a simplified version - you might want to use a proper TCP library
      const url = new URL(monitor.url);
      const host = url.hostname;
      const port = url.port || (url.protocol === 'https:' ? 443 : 80);
      
      // Use netstat or similar to test port connectivity
      // For now, we'll fall back to HTTP request
      const config = {
        method: monitor.method.toLowerCase(),
        url: monitor.url,
        timeout: monitor.timeout * 1000,
        validateStatus: (status) => status < 500,
        headers: {}
      };
      
      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      
      result = {
        success: true,
        responseTime,
        statusCode: response.status,
        status: 'up',
        error: null,
        timestamp: new Date()
      };
      
    } else {
      // Enhanced HTTP monitoring for website/api types
      const config = {
        method: monitor.method.toLowerCase(),
        url: monitor.url,
        timeout: monitor.timeout * 1000,
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        headers: {
          'User-Agent': 'Avodal-Uptime-Monitor/1.0',
          'Accept': '*/*',
          'Connection': 'close'
        },
        maxRedirects: 5, // Allow up to 5 redirects
        followRedirect: true
      };

      // Add custom headers
      if (monitor.headers && monitor.headers.length > 0) {
        monitor.headers.forEach(header => {
          if (header.name && header.value) {
            config.headers[header.name] = header.value;
          }
        });
      }

      // Add authentication
      if (monitor.authentication.type === 'basic' && monitor.authentication.username) {
        const auth = Buffer.from(
          `${monitor.authentication.username}:${monitor.authentication.password || ''}`
        ).toString('base64');
        config.headers.Authorization = `Basic ${auth}`;
      } else if (monitor.authentication.type === 'bearer' && monitor.authentication.token) {
        config.headers.Authorization = `Bearer ${monitor.authentication.token}`;
      }

      // Add request body for POST/PUT requests
      if (monitor.body && ['post', 'put', 'patch'].includes(monitor.method.toLowerCase())) {
        config.data = monitor.body;
        // Set content-type if not already set
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }

      console.log(`[HTTP] Monitoring ${monitor.method} ${monitor.url}`);

      // Perform the request
      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      result = {
        success: true,
        responseTime,
        statusCode: response.status,
        status: 'up',
        error: null,
        timestamp: new Date()
      };

      console.log(`[HTTP] ${monitor.url}: ${response.status} (${responseTime}ms)`);

      // Check if response meets expectations
      if (monitor.expectedStatus && response.status !== monitor.expectedStatus) {
        result.success = false;
        result.status = 'down';
        result.error = `Expected status ${monitor.expectedStatus}, got ${response.status}`;
      }

      if (monitor.expectedResponseTime && responseTime > monitor.expectedResponseTime) {
        result.success = false;
        result.status = 'down';
        result.error = `Response time ${responseTime}ms exceeds expected ${monitor.expectedResponseTime}ms`;
      }
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    result = {
      success: false,
      responseTime,
      statusCode: error.response?.status || 0,
      status: 'down',
      error: error.message,
      timestamp: new Date()
    };
  }

  // Update monitor with results
  await updateMonitorWithResult(monitor, result, io);

  return result;
};

// Update monitor with health check result
const updateMonitorWithResult = async (monitor, result, io) => {
  try {
    const wasUp = monitor.lastStatus === 'up';
    const isUp = result.success;

    // Save check result to database
    try {
      await storeCheckResult({
        monitorId: monitor._id,
        userId: monitor.user,
        status: result.status,
        responseTime: result.responseTime,
        statusCode: result.statusCode,
        error: result.error,
        requestDetails: {
          url: monitor.url,
          method: monitor.method,
          headers: monitor.headers,
          body: monitor.body,
          timeout: monitor.timeout
        }
      });
    } catch (checkError) {
      console.error('Error saving check result:', checkError);
      // Continue with monitor update even if check saving fails
    }

    // Update monitor statistics
    await monitor.updateStats(result.success, result.responseTime, result.statusCode);

    // Handle status changes
    if (wasUp && !isUp) {
      // Monitor went down
      await handleMonitorDown(monitor, result);
    } else if (!wasUp && isUp) {
      // Monitor came back up
      await handleMonitorUp(monitor, result);
    }

    // Emit real-time update via WebSocket
    if (io) {
      const updateData = {
        monitorId: monitor._id,
        status: monitor.lastStatus,
        responseTime: monitor.lastResponseTime,
        lastCheck: monitor.lastCheck,
        uptime: monitor.uptime,
        statusCode: result.statusCode,
        timestamp: new Date().toISOString()
      };
      
      // Emit to specific monitor room
      io.to(`monitor-${monitor._id}`).emit('monitor-update', updateData);
      
      // Emit to all clients for dashboard updates
      io.emit('dashboard-chart-update', updateData);
    }

  } catch (error) {
    console.error('Error updating monitor:', error);
  }
};

// Handle monitor going down
const handleMonitorDown = async (monitor, result) => {
  try {
    // Create incident
    const incident = await Incident.create({
      monitor: monitor._id,
      user: monitor.user,
      type: 'downtime',
      title: `${monitor.name} is down`,
      description: result.error || `Monitor ${monitor.name} is not responding`,
      startedAt: new Date(),
      status: 'investigating'
    });

    // Trigger alerts
    await triggerAlerts(monitor, incident, 'down');

    console.log(`Monitor ${monitor.name} went down: ${result.error}`);
  } catch (error) {
    console.error('Error handling monitor down:', error);
  }
};

// Handle monitor coming back up
const handleMonitorUp = async (monitor, result) => {
  try {
    // Find and resolve active incident
    const activeIncident = await Incident.findOne({
      monitor: monitor._id,
      status: { $in: ['investigating', 'identified', 'monitoring'] }
    });

    if (activeIncident) {
      await activeIncident.resolve('Monitor is back online');
    }

    // Trigger uptime alerts
    await triggerAlerts(monitor, null, 'up');

    console.log(`Monitor ${monitor.name} is back up`);
  } catch (error) {
    console.error('Error handling monitor up:', error);
  }
};

// Trigger alerts for monitor status change
const triggerAlerts = async (monitor, incident, status) => {
  try {
    const alerts = await Alert.find({
      monitor: monitor._id,
      status: 'active'
    });

    for (const alert of alerts) {
      if (alert.shouldTrigger({ 
        lastStatus: status,
        lastResponseTime: monitor.lastResponseTime,
        lastStatusCode: monitor.lastStatusCode,
        consecutiveFailures: status === 'down' ? 1 : 0,
        consecutiveSuccesses: status === 'up' ? 1 : 0
      })) {
        await triggerAlert(alert, monitor, incident);
      }
    }
  } catch (error) {
    console.error('Error triggering alerts:', error);
  }
};

// Trigger individual alert
const triggerAlert = async (alert, monitor, incident) => {
  try {
    const alertResult = await alert.trigger(monitor, 
      `${alert.name} triggered for ${monitor.name}`
    );

    // Send notifications
    const promises = [];

    if (alertResult.channels.includes('email')) {
      promises.push(sendMonitorAlert(alert, monitor, incident));
    }

    if (alertResult.channels.includes('whatsapp')) {
      const { sendMonitorAlertWhatsApp } = await import('./whatsappService.js');
      promises.push(sendMonitorAlertWhatsApp(alert, monitor, incident));
    }

    await Promise.allSettled(promises);

    console.log(`Alert ${alert.name} triggered for monitor ${monitor.name}`);
  } catch (error) {
    console.error('Error triggering alert:', error);
  }
};

// Cleanup completed incidents older than 30 days
const cleanupCompletedIncidents = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Incident.deleteMany({
      status: 'resolved',
      resolvedAt: { $lt: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} old incidents`);
    }
  } catch (error) {
    console.error('Error cleaning up incidents:', error);
  }
};

// Add monitor to monitoring service
export const addMonitorToService = (monitor, io) => {
  if (monitor.status === 'active') {
    startMonitoringJob(monitor, io);
  }
};

// Remove monitor from monitoring service
export const removeMonitorFromService = (monitorId) => {
  stopMonitoringJob(monitorId);
};

// Update monitor in monitoring service
export const updateMonitorInService = (monitor, io) => {
  removeMonitorFromService(monitor._id);
  if (monitor.status === 'active') {
    addMonitorToService(monitor, io);
  }
};
