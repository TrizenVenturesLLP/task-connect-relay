const { Schema, model } = require('mongoose');

const TaskSchema = new Schema(
  {
    // Basic task information
    type: { 
      type: String, 
      required: true, 
      index: true,
      enum: ['Home Services', 'Delivery', 'Tech Help', 'Cleaning', 'Handyman', 'Gardening', 'Moving', 'Other']
    },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    
    // Location with geospatial indexing
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere'
      },
      address: { type: String, required: true },
      city: { type: String, index: true },
      state: { type: String, index: true },
      country: { type: String, index: true },
      postalCode: String
    },
    
    // Time and scheduling
    preferredTime: {
      startDate: Date,
      endDate: Date,
      flexible: { type: Boolean, default: true },
      timeSlots: [String] // ['morning', 'afternoon', 'evening']
    },
    
    // Financial information
    budget: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'INR' },
      negotiable: { type: Boolean, default: true }
    },
    
    // Skills and requirements
    skillsRequired: { 
      type: [String], 
      index: true, 
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 20; // Max 20 skills
        },
        message: 'Skills array cannot exceed 20 items'
      }
    },
    
    // Task status and lifecycle
    status: { 
      type: String, 
      index: true, 
      default: 'open',
      enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired']
    },
    
    // User relationships
    creatorUid: { 
      type: String, 
      index: true, 
      required: true,
      ref: 'Profile'
    },
    assigneeUid: { 
      type: String, 
      index: true, 
      default: null,
      ref: 'Profile'
    },
    
    // Task completion details
    completion: {
      proofs: { type: [String], default: [] },
      comment: String,
      completedAt: Date,
      rating: { type: Number, min: 1, max: 5 },
      review: String
    },
    
    // Task metadata
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'urgent'], 
      default: 'medium' 
    },
    estimatedDuration: Number, // in hours
    images: { type: [String], default: [] },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, index: true },
    
    // Analytics and tracking
    views: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    isUrgent: { type: Boolean, default: false, index: true }
  },
  { 
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for common queries
TaskSchema.index({ status: 1, createdAt: -1 });
TaskSchema.index({ creatorUid: 1, status: 1 });
TaskSchema.index({ assigneeUid: 1, status: 1 });
TaskSchema.index({ type: 1, status: 1, createdAt: -1 });
TaskSchema.index({ 'location.city': 1, status: 1, createdAt: -1 });
TaskSchema.index({ skillsRequired: 1, status: 1, createdAt: -1 });
TaskSchema.index({ budget: 1, status: 1, createdAt: -1 });

// Virtual for task age
TaskSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Pre-save middleware to update timestamps
TaskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find nearby tasks
TaskSchema.statics.findNearby = function(coordinates, maxDistance = 50000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: 'open'
  });
};

// Instance method to check if task is expired
TaskSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

module.exports = model('Task', TaskSchema);

