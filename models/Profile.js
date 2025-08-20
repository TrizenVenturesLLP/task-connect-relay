const { Schema, model } = require('mongoose');

const ProfileSchema = new Schema(
  {
    // Basic user information
    uid: { 
      type: String, 
      index: true, 
      unique: true, 
      required: true 
    },
    name: { 
      type: String, 
      required: true, 
      maxlength: 100 
    },
    email: { 
      type: String, 
      index: true, 
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    
    // User roles and type
    roles: { 
      type: [String], 
      index: true, 
      default: ['both'],
      enum: ['poster', 'tasker', 'both']
    },
    userType: { 
      type: String, 
      enum: ['individual', 'business'], 
      default: 'individual' 
    },
    
    // Business-specific fields
    business: {
      name: String,
      registrationNumber: String,
      taxId: String,
      website: String,
      description: String
    },
    
    // Location with geospatial indexing
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      },
      address: String,
      addressDetails: {
        doorNo: String,
        area: String,
        city: { type: String, index: true },
        state: { type: String, index: true },
        pinCode: String,
        country: { type: String, index: true }
      },
      isPublic: { type: Boolean, default: true }
    },
    
    // Skills and expertise
    skills: { 
      type: [String], 
      index: true, 
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 50; // Max 50 skills
        },
        message: 'Skills array cannot exceed 50 items'
      }
    },
    
    // Availability and scheduling
    availability: {
      schedule: {
        monday: { available: Boolean, slots: [String] },
        tuesday: { available: Boolean, slots: [String] },
        wednesday: { available: Boolean, slots: [String] },
        thursday: { available: Boolean, slots: [String] },
        friday: { available: Boolean, slots: [String] },
        saturday: { available: Boolean, slots: [String] },
        sunday: { available: Boolean, slots: [String] }
      },
      timezone: { type: String, default: 'Asia/Kolkata' },
      instantBooking: { type: Boolean, default: false },
      advanceBooking: { type: Number, default: 24 } // hours
    },
    
    // Contact information
    phone: { 
      type: String,
      validate: {
        validator: function(v) {
          return /^\+?[\d\s\-\(\)]+$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    photoURL: String,
    
    // Ratings and reviews
    rating: { 
      type: Number, 
      min: 0, 
      max: 5, 
      default: 0 
    },
    totalReviews: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    
    // Verification and trust
    isVerified: { type: Boolean, default: false, index: true },
    verificationDocuments: [String],
    backgroundCheck: {
      status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
      completedAt: Date
    },
    
    // Preferences and settings
    preferences: {
      maxDistance: { type: Number, default: 50 }, // km
      minBudget: { type: Number, default: 0 },
      maxBudget: { type: Number, default: 10000 },
      preferredCategories: [String],
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false }
      }
    },
    
    // Legal and consent
    agreeUpdates: { type: Boolean, default: false },
    agreeTerms: { type: Boolean, default: false },
    privacySettings: {
      profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
      locationSharing: { type: Boolean, default: true },
      contactSharing: { type: Boolean, default: false }
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now, index: true },
    
    // Account status
    isActive: { type: Boolean, default: true, index: true },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String
  },
  { 
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for common queries
ProfileSchema.index({ roles: 1, isActive: 1 });
ProfileSchema.index({ 'location.coordinates': '2dsphere' });
ProfileSchema.index({ skills: 1, isActive: 1 });
ProfileSchema.index({ rating: -1, totalReviews: -1 });
ProfileSchema.index({ isVerified: 1, rating: -1 });
ProfileSchema.index({ userType: 1, isActive: 1 });

// Virtual for completion rate
ProfileSchema.virtual('completionRate').get(function() {
  return this.totalTasks > 0 ? (this.completedTasks / this.totalTasks) * 100 : 0;
});

// Virtual for average rating
ProfileSchema.virtual('averageRating').get(function() {
  return this.totalReviews > 0 ? this.rating : 0;
});

// Pre-save middleware to update timestamps
ProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.lastActive = new Date();
  next();
});

// Static method to find nearby users
ProfileSchema.statics.findNearby = function(coordinates, maxDistance = 50000) {
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
    isActive: true
  });
};

// Static method to find users by skills
ProfileSchema.statics.findBySkills = function(skills, limit = 50) {
  return this.find({
    skills: { $in: skills },
    isActive: true,
    roles: { $in: ['tasker', 'both'] }
  })
  .sort({ rating: -1, totalReviews: -1 })
  .limit(limit);
};

// Instance method to update rating
ProfileSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating * this.totalReviews) + newRating;
  this.totalReviews += 1;
  this.rating = totalRating / this.totalReviews;
  return this.save();
};

module.exports = model('Profile', ProfileSchema);

