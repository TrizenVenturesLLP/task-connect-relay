const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// In-memory storage for development when MongoDB is not available
const inMemoryProfiles = new Map();

// Profile Schema
const ProfileSchema = new Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  roles: {
    type: [String],
    enum: ['tasker', 'requester', 'both'],
    default: ['both']
  },
  userType: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    },
    address: String,
    doorNo: String,
    area: String,
    city: String,
    state: String,
    pinCode: String,
    country: String
  },
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'beginner'
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalTasks: {
    type: Number,
    default: 0
  },
  completedTasks: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  onboardingStatus: {
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedSteps: {
      location: {
        type: Boolean,
        default: false
      },
      roles: {
        type: Boolean,
        default: false
      },
      profile: {
        type: Boolean,
        default: false
      }
    },
    lastStep: {
      type: String,
      enum: ['location', 'roles', 'profile'],
      default: 'location'
    }
  },
  agreeUpdates: {
    type: Boolean,
    default: false
  },
  agreeTerms: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for geospatial queries
ProfileSchema.index({ 'location.coordinates': '2dsphere' });

// In-memory methods
ProfileSchema.statics.findOneInMemory = function(query) {
  if (query.uid) {
    return inMemoryProfiles.get(query.uid) || null;
  }
  // For other queries, return first match (simplified)
  for (const profile of inMemoryProfiles.values()) {
    if (Object.keys(query).every(key => profile[key] === query[key])) {
      return profile;
    }
  }
  return null;
};

ProfileSchema.statics.findOneAndUpdateInMemory = function(query, update, options) {
  const existingProfile = this.findOneInMemory(query);
  if (!existingProfile) {
    return null;
  }
  
  const updatedProfile = { ...existingProfile, ...update };
  if (query.uid) {
    inMemoryProfiles.set(query.uid, updatedProfile);
  }
  return updatedProfile;
};

ProfileSchema.statics.createInMemory = function(profileData) {
  const profile = { ...profileData, createdAt: new Date(), updatedAt: new Date() };
  inMemoryProfiles.set(profile.uid, profile);
  return profile;
};

// Helper function to create mock query results
function createMockQuery(result) {
  return {
    lean: function() {
      return result;
    },
    exec: function() {
      return Promise.resolve(result);
    },
    then: function(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    }
  };
}

// Create the model
const Profile = model('Profile', ProfileSchema);

// Store original methods before overriding
const originalFindOne = Profile.findOne.bind(Profile);
const originalFindOneAndUpdate = Profile.findOneAndUpdate.bind(Profile);
const originalUpdateOne = Profile.updateOne.bind(Profile);
const originalCreate = Profile.create.bind(Profile);

// Dynamic MongoDB connection check function
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// Override methods with dynamic connection checking
Profile.findOne = function(query) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Profile.findOne');
    return originalFindOne(query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Profile.findOne');
    const result = Profile.findOneInMemory(query);
    return createMockQuery(result);
  }
};

Profile.findOneAndUpdate = function(query, update, options) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Profile.findOneAndUpdate');
    return originalFindOneAndUpdate(query, update, options);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Profile.findOneAndUpdate');
    const result = Profile.findOneAndUpdateInMemory(query, update, options);
    return createMockQuery(result);
  }
};

Profile.updateOne = function(query, update, options) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Profile.updateOne');
    return originalUpdateOne(query, update, options);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Profile.updateOne');
    const uid = query.uid;
    if (!uid) {
      return createMockQuery({ modifiedCount: 0 });
    }
    
    const existingProfile = inMemoryProfiles.get(uid);
    
    // Handle $set operator like MongoDB does
    let updateData = update;
    if (update.$set) {
      updateData = update.$set;
    }
    
    if (!existingProfile) {
      // Create new profile if it doesn't exist (upsert behavior)
      const newProfile = {
        uid,
        name: 'User', // Default name
        email: null,
        roles: ['both'], // Default roles
        userType: 'individual',
        skills: [],
        rating: 0,
        totalReviews: 0,
        totalTasks: 0,
        completedTasks: 0,
        isVerified: false,
        isActive: true,
        onboardingStatus: {
          isCompleted: false,
          completedSteps: { location: false, roles: false, profile: false },
          lastStep: 'location'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: new Date(),
        ...updateData // Override defaults with provided data
      };
      inMemoryProfiles.set(uid, newProfile);
      console.log('✅ Created new profile in memory for user:', uid);
      console.log('📝 New profile data:', JSON.stringify(newProfile, null, 2));
      return createMockQuery({ modifiedCount: 1 });
    }
    
    const updatedProfile = {
      ...existingProfile,
      ...updateData,
      uid,
      updatedAt: new Date()
    };
    
    inMemoryProfiles.set(uid, updatedProfile);
    console.log('✅ Updated existing profile in memory for user:', uid);
    console.log('📝 Updated profile data:', JSON.stringify(updatedProfile, null, 2));
    return createMockQuery({ modifiedCount: 1 });
  }
};

Profile.create = function(profileData) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Profile.create');
    return originalCreate(profileData);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Profile.create');
    return Profile.createInMemory(profileData);
  }
};

module.exports = Profile;

