const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema(
  {
    // Task and users relationship
    taskId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Task', 
      required: true, 
      index: true 
    },
    reviewerUid: { 
      type: String, 
      ref: 'Profile', 
      required: true, 
      index: true 
    },
    reviewedUid: { 
      type: String, 
      ref: 'Profile', 
      required: true, 
      index: true 
    },
    
    // Review content
    rating: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    title: { 
      type: String, 
      maxlength: 100 
    },
    comment: { 
      type: String, 
      maxlength: 1000 
    },
    
    // Rating breakdown
    ratings: {
      communication: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      timeliness: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 }
    },
    
    // Review metadata
    isPublic: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    helpful: { type: Number, default: 0 },
    notHelpful: { type: Number, default: 0 },
    
    // Response from reviewed user
    response: {
      comment: String,
      timestamp: Date
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { 
    versionKey: false,
    timestamps: true
  }
);

// Compound indexes
ReviewSchema.index({ taskId: 1, reviewerUid: 1 }, { unique: true });
ReviewSchema.index({ reviewedUid: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1, createdAt: -1 });
ReviewSchema.index({ isPublic: 1, isVerified: 1 });

// Pre-save middleware
ReviewSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get reviews for a user
ReviewSchema.statics.getUserReviews = function(userUid, options = {}) {
  const { limit = 20, skip = 0, rating = null } = options;
  
  const query = { reviewedUid: userUid, isPublic: true };
  if (rating) query.rating = rating;
  
  return this.find(query)
    .populate('reviewerUid', 'name photoURL')
    .populate('taskId', 'title type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to calculate average rating
ReviewSchema.statics.getAverageRating = function(userUid) {
  return this.aggregate([
    { $match: { reviewedUid: userUid, isPublic: true } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
};

// Instance method to calculate overall rating
ReviewSchema.methods.getOverallRating = function() {
  const ratings = this.ratings;
  if (!ratings) return this.rating;
  
  const values = Object.values(ratings).filter(v => v !== undefined);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : this.rating;
};

module.exports = model('Review', ReviewSchema);
