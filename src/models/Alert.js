import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  monitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    required: true
  },
  type: {
    type: String,
    enum: ['downtime', 'uptime', 'slow_response', 'ssl_expiry', 'custom'],
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide an alert name'],
    trim: true,
    maxlength: [100, 'Alert name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  conditions: {
    // For downtime alerts
    downtimeThreshold: {
      type: Number, // consecutive failed checks
      default: 1
    },
    // For slow response alerts
    responseTimeThreshold: {
      type: Number, // in milliseconds
      default: 5000
    },
    // For SSL expiry alerts
    sslExpiryDays: {
      type: Number, // days before expiry
      default: 30
    },
    // Custom conditions
    customCondition: {
      type: String,
      enum: ['status_code', 'response_time', 'response_size', 'content_check'],
      default: 'status_code'
    },
    customValue: String,
    customOperator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains'],
      default: 'equals'
    }
  },
  channels: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      recipients: [{
        email: {
          type: String,
          required: true,
          match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
        },
        name: String
      }]
    },
  },
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    startTime: String, // HH:MM format
    endTime: String    // HH:MM format
  },
  escalation: {
    enabled: {
      type: Boolean,
      default: false
    },
    delay: {
      type: Number, // in minutes
      default: 15
    },
    maxEscalations: {
      type: Number,
      default: 3
    },
    escalationChannels: [{
      type: String,
      enum: ['email']
    }]
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'disabled'],
    default: 'active'
  },
  lastTriggered: Date,
  triggerCount: {
    type: Number,
    default: 0
  },
  // Alert history
  history: [{
    triggeredAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['alert', 'escalation', 'resolution']
    },
    message: String,
    channels: [String],
    success: {
      type: Boolean,
      default: true
    },
    error: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
alertSchema.index({ user: 1, status: 1 });
alertSchema.index({ monitor: 1, status: 1 });
alertSchema.index({ type: 1, status: 1 });
alertSchema.index({ lastTriggered: -1 });

// Method to check if alert should be triggered
alertSchema.methods.shouldTrigger = function(monitorData) {
  if (this.status !== 'active') return false;
  
  // Check schedule if enabled
  if (this.schedule.enabled && !this.isWithinSchedule()) {
    return false;
  }
  
  switch (this.type) {
    case 'downtime':
      return this.checkDowntimeCondition(monitorData);
    case 'uptime':
      return this.checkUptimeCondition(monitorData);
    case 'slow_response':
      return this.checkSlowResponseCondition(monitorData);
    case 'ssl_expiry':
      return this.checkSSLExpiryCondition(monitorData);
    case 'custom':
      return this.checkCustomCondition(monitorData);
    default:
      return false;
  }
};

// Check if current time is within alert schedule
alertSchema.methods.isWithinSchedule = function() {
  if (!this.schedule.enabled) return true;
  
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Check if current day is in schedule
  if (!this.schedule.days.includes(currentDay)) return false;
  
  // Check if current time is within schedule
  if (this.schedule.startTime && this.schedule.endTime) {
    return currentTime >= this.schedule.startTime && currentTime <= this.schedule.endTime;
  }
  
  return true;
};

// Check downtime condition
alertSchema.methods.checkDowntimeCondition = function(monitorData) {
  return monitorData.lastStatus === 'down' && 
         monitorData.consecutiveFailures >= this.conditions.downtimeThreshold;
};

// Check uptime condition
alertSchema.methods.checkUptimeCondition = function(monitorData) {
  return monitorData.lastStatus === 'up' && 
         monitorData.consecutiveSuccesses >= this.conditions.downtimeThreshold;
};

// Check slow response condition
alertSchema.methods.checkSlowResponseCondition = function(monitorData) {
  return monitorData.lastResponseTime > this.conditions.responseTimeThreshold;
};

// Check SSL expiry condition
alertSchema.methods.checkSSLExpiryCondition = function(monitorData) {
  if (!monitorData.sslExpiry) return false;
  
  const expiryDate = new Date(monitorData.sslExpiry);
  const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry <= this.conditions.sslExpiryDays;
};

// Check custom condition
alertSchema.methods.checkCustomCondition = function(monitorData) {
  const { customCondition, customValue, customOperator } = this.conditions;
  
  let actualValue;
  switch (customCondition) {
    case 'status_code':
      actualValue = monitorData.lastStatusCode;
      break;
    case 'response_time':
      actualValue = monitorData.lastResponseTime;
      break;
    case 'response_size':
      actualValue = monitorData.lastResponseSize;
      break;
    case 'content_check':
      actualValue = monitorData.lastResponseContent;
      break;
    default:
      return false;
  }
  
  return this.evaluateCondition(actualValue, customValue, customOperator);
};

// Evaluate condition based on operator
alertSchema.methods.evaluateCondition = function(actualValue, expectedValue, operator) {
  switch (operator) {
    case 'equals':
      return actualValue == expectedValue;
    case 'not_equals':
      return actualValue != expectedValue;
    case 'greater_than':
      return actualValue > expectedValue;
    case 'less_than':
      return actualValue < expectedValue;
    case 'contains':
      return String(actualValue).includes(String(expectedValue));
    case 'not_contains':
      return !String(actualValue).includes(String(expectedValue));
    default:
      return false;
  }
};

// Method to trigger alert
alertSchema.methods.trigger = async function(monitorData, message) {
  this.lastTriggered = new Date();
  this.triggerCount += 1;
  
  // Add to history
  this.history.push({
    triggeredAt: new Date(),
    type: 'alert',
    message: message || `${this.name} triggered for ${monitorData.name}`,
    channels: this.getActiveChannels(),
    success: true
  });
  
  // Keep only last 100 history entries
  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }
  
  await this.save();
  
  return {
    alert: this,
    channels: this.getActiveChannels(),
    message: message || `${this.name} triggered for ${monitorData.name}`
  };
};

// Get active notification channels
alertSchema.methods.getActiveChannels = function() {
  const channels = [];
  
  if (this.channels.email.enabled && this.channels.email.recipients.length > 0) {
    channels.push('email');
  }
  
  
  return channels;
};

export default mongoose.model('Alert', alertSchema);
