import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['downtime', 'slow_response', 'ssl_expiry', 'maintenance'],
    required: true
  },
  status: {
    type: String,
    enum: ['investigating', 'identified', 'monitoring', 'resolved'],
    default: 'investigating'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  title: {
    type: String,
    required: [true, 'Please provide an incident title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide an incident description'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  affectedServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor'
  }],
  updates: [{
    status: {
      type: String,
      enum: ['investigating', 'identified', 'monitoring', 'resolved'],
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Update message cannot be more than 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  }],
  metrics: {
    responseTime: {
      before: Number,
      during: Number,
      after: Number
    },
    errorRate: {
      before: Number,
      during: Number,
      after: Number
    },
    affectedUsers: {
      type: Number,
      default: 0
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  publicId: {
    type: String,
    unique: true,
    sparse: true
  },
  tags: [String],
  // Post-incident analysis
  postMortem: {
    rootCause: String,
    impact: String,
    resolution: String,
    prevention: String,
    lessonsLearned: String,
    completedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
incidentSchema.index({ monitor: 1, startedAt: -1 });
incidentSchema.index({ user: 1, startedAt: -1 });
incidentSchema.index({ status: 1, startedAt: -1 });
incidentSchema.index({ isPublic: 1, publicId: 1 });
incidentSchema.index({ startedAt: -1 });

// Pre-save middleware to generate public ID
incidentSchema.pre('save', function(next) {
  if (this.isPublic && !this.publicId) {
    this.publicId = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Method to add incident update
incidentSchema.methods.addUpdate = function(status, message, isPublic = true) {
  this.updates.push({
    status,
    message,
    isPublic,
    timestamp: new Date()
  });
  
  this.status = status;
  
  if (status === 'resolved') {
    this.resolvedAt = new Date();
    this.duration = Math.round((this.resolvedAt - this.startedAt) / (1000 * 60)); // in minutes
  }
  
  return this.save();
};

// Method to resolve incident
incidentSchema.methods.resolve = function(resolutionMessage) {
  return this.addUpdate('resolved', resolutionMessage || 'Incident has been resolved');
};

// Method to get public incident data
incidentSchema.methods.getPublicData = function() {
  const incident = this.toObject();
  
  // Filter updates to only public ones
  incident.updates = incident.updates.filter(update => update.isPublic);
  
  // Remove sensitive information
  delete incident.user;
  delete incident.monitor;
  delete incident.postMortem;
  
  return incident;
};

// Static method to get active incidents
incidentSchema.statics.getActiveIncidents = function() {
  return this.find({
    status: { $in: ['investigating', 'identified', 'monitoring'] }
  }).populate('monitor', 'name url type').populate('user', 'name email');
};

// Static method to get public incidents
incidentSchema.statics.getPublicIncidents = function(limit = 10) {
  return this.find({
    isPublic: true,
    status: { $in: ['investigating', 'identified', 'monitoring', 'resolved'] }
  })
  .sort({ startedAt: -1 })
  .limit(limit)
  .select('title description status startedAt resolvedAt duration updates publicId');
};

export default mongoose.model('Incident', incidentSchema);
