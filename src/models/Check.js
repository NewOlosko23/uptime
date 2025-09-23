import mongoose from 'mongoose';

const checkSchema = new mongoose.Schema({
  monitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['up', 'down', 'unknown'],
    required: true
  },
  responseTime: {
    type: Number,
    required: true,
    min: 0
  },
  statusCode: {
    type: Number,
    required: true
  },
  error: {
    type: String,
    default: null
  },
  region: {
    type: String,
    default: 'default'
  },
  // Additional metrics
  metrics: {
    dnsLookupTime: Number,
    tcpConnectTime: Number,
    sslHandshakeTime: Number,
    timeToFirstByte: Number,
    contentLength: Number,
    redirectCount: Number
  },
  // Response headers for debugging
  responseHeaders: {
    type: Map,
    of: String
  },
  // Request details for debugging
  requestDetails: {
    url: String,
    method: String,
    headers: Map,
    body: String,
    timeout: Number
  }
}, {
  timestamps: true
});

// Indexes for better query performance
checkSchema.index({ monitor: 1, timestamp: -1 });
checkSchema.index({ user: 1, timestamp: -1 });
checkSchema.index({ timestamp: -1 });
checkSchema.index({ status: 1, timestamp: -1 });

// Compound index for efficient metrics queries
checkSchema.index({ monitor: 1, status: 1, timestamp: -1 });

// Method to get check statistics for a monitor
checkSchema.statics.getMonitorStats = async function(monitorId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        monitor: new mongoose.Types.ObjectId(monitorId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalChecks: { $sum: 1 },
        successfulChecks: {
          $sum: { $cond: [{ $eq: ['$status', 'up'] }, 1, 0] }
        },
        failedChecks: {
          $sum: { $cond: [{ $eq: ['$status', 'down'] }, 1, 0] }
        },
        averageResponseTime: { $avg: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        uptime: {
          $avg: { $cond: [{ $eq: ['$status', 'up'] }, 100, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    averageResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    uptime: 0
  };
};

// Method to get hourly metrics for charts
checkSchema.statics.getHourlyMetrics = async function(monitorId, hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);
  
  const metrics = await this.aggregate([
    {
      $match: {
        monitor: new mongoose.Types.ObjectId(monitorId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        },
        timestamp: { $first: '$timestamp' },
        responseTime: { $avg: '$responseTime' },
        status: {
          $push: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $addFields: {
        uptime: {
          $multiply: [
            {
              $divide: [
                { $size: { $filter: { input: '$status', cond: { $eq: ['$$this', 'up'] } } } },
                '$count'
              ]
            },
            100
          ]
        }
      }
    },
    {
      $sort: { timestamp: 1 }
    }
  ]);
  
  return metrics;
};

export default mongoose.model('Check', checkSchema);
