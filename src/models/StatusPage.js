import mongoose from 'mongoose';

const statusPageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a status page name'],
    trim: true,
    maxlength: [100, 'Status page name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  domain: {
    type: String,
    trim: true,
    match: [/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Please provide a valid domain']
  },
  customDomain: {
    type: String,
    trim: true
  },
  monitors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor'
  }],
  services: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    monitors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor'
    }],
    status: {
      type: String,
      enum: ['operational', 'degraded', 'partial_outage', 'major_outage'],
      default: 'operational'
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  design: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    primaryColor: {
      type: String,
      default: '#3175e3'
    },
    logo: String,
    favicon: String,
    customCSS: String,
    showIncidents: {
      type: Boolean,
      default: true
    },
    showMetrics: {
      type: Boolean,
      default: true
    },
    showUptime: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    allowSubscriptions: {
      type: Boolean,
      default: true
    },
    showResponseTime: {
      type: Boolean,
      default: true
    },
    showLastCheck: {
      type: Boolean,
      default: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  subscribers: [{
    email: {
      type: String,
      required: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    subscribedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  metrics: {
    totalViews: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
statusPageSchema.index({ user: 1, status: 1 });
// Note: slug index is automatically created by unique: true
statusPageSchema.index({ customDomain: 1 });
statusPageSchema.index({ 'settings.isPublic': 1, status: 1 });

// Pre-save middleware to generate slug if not provided
statusPageSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Method to get public URL
statusPageSchema.methods.getPublicUrl = function() {
  if (this.customDomain) {
    return `https://${this.customDomain}`;
  }
  return `${process.env.CLIENT_URL}/status/${this.slug}`;
};

// Method to calculate overall status
statusPageSchema.methods.getOverallStatus = async function() {
  const Monitor = mongoose.model('Monitor');
  
  if (this.monitors.length === 0) {
    return 'operational';
  }
  
  const monitors = await Monitor.find({ _id: { $in: this.monitors } });
  
  if (monitors.length === 0) {
    return 'operational';
  }
  
  const downMonitors = monitors.filter(monitor => monitor.lastStatus === 'down');
  const downPercentage = (downMonitors.length / monitors.length) * 100;
  
  if (downPercentage >= 50) {
    return 'major_outage';
  } else if (downPercentage >= 25) {
    return 'partial_outage';
  } else if (downPercentage > 0) {
    return 'degraded';
  }
  
  return 'operational';
};

// Method to get uptime statistics
statusPageSchema.methods.getUptimeStats = async function(period = 30) {
  const Monitor = mongoose.model('Monitor');
  
  if (this.monitors.length === 0) {
    return { uptime: 100, totalChecks: 0, successfulChecks: 0 };
  }
  
  const monitors = await Monitor.find({ _id: { $in: this.monitors } });
  
  const totalChecks = monitors.reduce((sum, monitor) => sum + monitor.totalChecks, 0);
  const successfulChecks = monitors.reduce((sum, monitor) => sum + monitor.successfulChecks, 0);
  
  const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;
  
  return {
    uptime: Math.round(uptime * 100) / 100,
    totalChecks,
    successfulChecks,
    failedChecks: totalChecks - successfulChecks
  };
};

// Method to add subscriber
statusPageSchema.methods.addSubscriber = function(email) {
  const existingSubscriber = this.subscribers.find(sub => sub.email === email);
  
  if (existingSubscriber) {
    if (!existingSubscriber.isActive) {
      existingSubscriber.isActive = true;
      existingSubscriber.subscribedAt = new Date();
    }
  } else {
    this.subscribers.push({
      email,
      subscribedAt: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

// Method to remove subscriber
statusPageSchema.methods.removeSubscriber = function(email) {
  const subscriber = this.subscribers.find(sub => sub.email === email);
  if (subscriber) {
    subscriber.isActive = false;
  }
  return this.save();
};

// Method to get active subscribers
statusPageSchema.methods.getActiveSubscribers = function() {
  return this.subscribers.filter(sub => sub.isActive);
};

// Method to record page view
statusPageSchema.methods.recordView = function() {
  this.metrics.totalViews += 1;
  this.metrics.lastViewed = new Date();
  return this.save();
};

// Static method to get public status page
statusPageSchema.statics.getPublicStatusPage = function(slug) {
  return this.findOne({
    slug,
    status: 'active',
    'settings.isPublic': true
  }).populate('monitors', 'name url type lastStatus lastCheck lastResponseTime uptime');
};

export default mongoose.model('StatusPage', statusPageSchema);
