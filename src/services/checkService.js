import Check from '../models/Check.js';
import Monitor from '../models/Monitor.js';

/**
 * Store a check result in the database
 * @param {Object} checkData - The check result data
 * @param {string} checkData.monitorId - The monitor ID
 * @param {string} checkData.userId - The user ID
 * @param {string} checkData.status - The check status (up/down/unknown)
 * @param {number} checkData.responseTime - Response time in milliseconds
 * @param {number} checkData.statusCode - HTTP status code
 * @param {string} checkData.error - Error message if any
 * @param {Object} checkData.metrics - Additional metrics
 * @param {Object} checkData.responseHeaders - Response headers
 * @param {Object} checkData.requestDetails - Request details
 * @returns {Promise<Object>} The saved check result
 */
export const storeCheckResult = async (checkData) => {
  try {
    const {
      monitorId,
      userId,
      status,
      responseTime,
      statusCode,
      error = null,
      metrics = {},
      responseHeaders = {},
      requestDetails = {},
      region = 'default'
    } = checkData;

    // Create new check record
    const check = new Check({
      monitor: monitorId,
      user: userId,
      status,
      responseTime,
      statusCode,
      error,
      metrics,
      responseHeaders,
      requestDetails,
      region
    });

    const savedCheck = await check.save();

    // Update monitor statistics
    await updateMonitorStats(monitorId, status, responseTime, statusCode);

    return savedCheck;
  } catch (error) {
    console.error('Error storing check result:', error);
    throw error;
  }
};

/**
 * Update monitor statistics based on check result
 * @param {string} monitorId - The monitor ID
 * @param {string} status - The check status
 * @param {number} responseTime - Response time in milliseconds
 * @param {number} statusCode - HTTP status code
 */
export const updateMonitorStats = async (monitorId, status, responseTime, statusCode) => {
  try {
    const monitor = await Monitor.findById(monitorId);
    if (!monitor) {
      throw new Error('Monitor not found');
    }

    // Update monitor stats using the existing method
    await monitor.updateStats(
      status === 'up',
      responseTime,
      statusCode
    );
  } catch (error) {
    console.error('Error updating monitor stats:', error);
    throw error;
  }
};

/**
 * Get check statistics for a monitor
 * @param {string} monitorId - The monitor ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Statistics object
 */
export const getCheckStatistics = async (monitorId, days = 7) => {
  try {
    return await Check.getMonitorStats(monitorId, days);
  } catch (error) {
    console.error('Error getting check statistics:', error);
    throw error;
  }
};

/**
 * Get hourly metrics for charts
 * @param {string} monitorId - The monitor ID
 * @param {number} hours - Number of hours to look back
 * @returns {Promise<Array>} Array of hourly metrics
 */
export const getHourlyMetrics = async (monitorId, hours = 24) => {
  try {
    return await Check.getHourlyMetrics(monitorId, hours);
  } catch (error) {
    console.error('Error getting hourly metrics:', error);
    throw error;
  }
};

/**
 * Clean up old check records to prevent database bloat
 * @param {number} daysToKeep - Number of days of data to keep
 */
export const cleanupOldChecks = async (daysToKeep = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await Check.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    console.log(`Cleaned up ${result.deletedCount} old check records`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old checks:', error);
    throw error;
  }
};

/**
 * Get recent checks for a monitor
 * @param {string} monitorId - The monitor ID
 * @param {number} limit - Maximum number of checks to return
 * @returns {Promise<Array>} Array of recent checks
 */
export const getRecentChecks = async (monitorId, limit = 50) => {
  try {
    return await Check.find({ monitor: monitorId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('timestamp status responseTime statusCode error');
  } catch (error) {
    console.error('Error getting recent checks:', error);
    throw error;
  }
};
