const { Schema, model } = require('mongoose');

const TaskApplicationSchema = new Schema(
  {
    // Task and applicant relationship
    taskId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Task', 
      required: true, 
      index: true 
    },
    applicantUid: { 
      type: String, 
      ref: 'Profile', 
      required: true, 
      index: true 
    },
    
    // Application details
    proposedBudget: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'INR' },
      isNegotiable: { type: Boolean, default: true }
    },
    
    proposedTime: {
      startDate: Date,
      endDate: Date,
      estimatedDuration: Number, // in hours
      flexible: { type: Boolean, default: true }
    },
    
    // Application content
    coverLetter: { 
      type: String, 
      maxlength: 1000 
    },
    relevantExperience: [String],
    portfolio: [String], // URLs to portfolio items
    
    // Application status
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'], 
      default: 'pending',
      index: true 
    },
    
    // Communication
    messages: [{
      senderUid: { type: String, required: true },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      isRead: { type: Boolean, default: false }
    }],
    
    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    respondedAt: Date,
    
    // Metadata
    isUrgent: { type: Boolean, default: false },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    }
  },
  { 
    versionKey: false,
    timestamps: true
  }
);

// Compound indexes
TaskApplicationSchema.index({ taskId: 1, status: 1 });
TaskApplicationSchema.index({ applicantUid: 1, status: 1 });
TaskApplicationSchema.index({ taskId: 1, applicantUid: 1 }, { unique: true });
TaskApplicationSchema.index({ createdAt: -1, status: 1 });

// Pre-save middleware
TaskApplicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('status') && this.status !== 'pending') {
    this.respondedAt = new Date();
  }
  next();
});

// Static method to get applications for a task
TaskApplicationSchema.statics.getTaskApplications = function(taskId, status = null) {
  const query = { taskId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('applicantUid', 'name photoURL rating totalReviews skills')
    .sort({ createdAt: -1 });
};

// Instance method to add message
TaskApplicationSchema.methods.addMessage = function(senderUid, message) {
  this.messages.push({
    senderUid,
    message,
    timestamp: new Date(),
    isRead: false
  });
  return this.save();
};

module.exports = model('TaskApplication', TaskApplicationSchema);
