import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a monitor name'],
    trim: true,
    maxlength: [100, 'Monitor name cannot be more than 100 characters']
  },
  url: {
    type: String,
    required: [true, 'Please provide a URL'],
    trim: true
  },
  type: {
    type: String,
    enum: ['website', 'api', 'server', 'port'],
    required: true,
    default: 'website'
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    default: 'GET'
  },
  expectedStatus: {
    type: Number,
    default: 200
  },
  expectedResponseTime: {
    type: Number, // in milliseconds
    default: 5000
  },
  monitoringInterval: {
    type: Number, // in seconds
    default: 300, // 5 minutes
    min: 30,
    max: 3600
  },
  timeout: {
    type: Number, // in seconds
    default: 30,
    min: 5,
    max: 300
  },
  headers: [{
    name: String,
    value: String
  }],
  body: {
    type: String,
    default: ''
  },
  authentication: {
    type: {
      type: String,
      enum: ['none', 'basic', 'bearer'],
      default: 'none'
    },
    username: String,
    password: String,
    token: String
  },
  ssl: {
    verify: {
      type: Boolean,
      default: true
    },
    ignoreExpiry: {
      type: Boolean,
      default: false
    }
  },
  regions: [{
    type: String,
    enum: ['us-east', 'us-west', 'eu-west', 'asia-pacific', 'africa'],
    default: ['us-east']
  }],
  status: {
    type: String,
    enum: ['active', 'paused', 'maintenance'],
    default: 'active'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  // Monitoring data
  lastCheck: {
    type: Date,
    default: Date.now
  },
  lastStatus: {
    type: String,
    enum: ['up', 'down', 'unknown'],
    default: 'unknown'
  },
  lastResponseTime: {
    type: Number,
    default: 0
  },
  lastStatusCode: {
    type: Number,
    default: 0
  },
  uptime: {
    type: Number,
    default: 0 // percentage
  },
  totalChecks: {
    type: Number,
    default: 0
  },
  successfulChecks: {
    type: Number,
    default: 0
  },
  failedChecks: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  // Alert settings
  alertSettings: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      contacts: [String]
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      contacts: [String]
    },
    escalation: {
      enabled: {
        type: Boolean,
        default: false
      },
      delay: {
        type: Number,
        default: 300 // 5 minutes
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
monitorSchema.index({ user: 1, status: 1 });
monitorSchema.index({ url: 1 });
monitorSchema.index({ lastCheck: 1 });
monitorSchema.index({ isPublic: 1 });

// Virtual for uptime percentage
monitorSchema.virtual('uptimePercentage').get(function() {
  if (this.totalChecks === 0) return 0;
  return Math.round((this.successfulChecks / this.totalChecks) * 100 * 100) / 100;
});

// Method to update monitoring stats
monitorSchema.methods.updateStats = function(isSuccess, responseTime, statusCode) {
  this.lastCheck = new Date();
  this.lastResponseTime = responseTime;
  this.lastStatusCode = statusCode;
  this.totalChecks += 1;
  
  if (isSuccess) {
    this.lastStatus = 'up';
    this.successfulChecks += 1;
  } else {
    this.lastStatus = 'down';
    this.failedChecks += 1;
  }
  
  // Calculate average response time
  const totalResponseTime = this.averageResponseTime * (this.totalChecks - 1) + responseTime;
  this.averageResponseTime = Math.round(totalResponseTime / this.totalChecks);
  
  // Calculate uptime percentage
  this.uptime = this.uptimePercentage;
  
  return this.save();
};

// Method to check if monitor should be checked
monitorSchema.methods.shouldCheck = function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  const timeSinceLastCheck = (now - this.lastCheck) / 1000; // in seconds
  
  return timeSinceLastCheck >= this.monitoringInterval;
};

// Method to get monitoring configuration for external service
monitorSchema.methods.getMonitoringConfig = function() {
  return {
    id: this._id,
    url: this.url,
    type: this.type,
    method: this.method,
    expectedStatus: this.expectedStatus,
    expectedResponseTime: this.expectedResponseTime,
    timeout: this.timeout,
    headers: this.headers,
    body: this.body,
    authentication: this.authentication,
    ssl: this.ssl,
    regions: this.regions
  };
};

export default mongoose.model('Monitor', monitorSchema);
