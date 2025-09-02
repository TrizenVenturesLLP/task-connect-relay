const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// In-memory storage for development when MongoDB is not available

const inMemoryTasks = new Map();

// Sample task data for development
const sampleTasks = [
  {
    _id: 'task_1',
    title: 'Replace a kitchen tap',
    description: 'Need help replacing a leaking kitchen tap. The old tap needs to be removed and a new one installed.',
    category: 'repair',
    subcategory: 'plumbing',
    budget: 1200,
    budgetType: 'fixed',
    location: {
      type: 'Point',
      coordinates: [78.4741, 17.3850], // Hyderabad coordinates
      address: 'Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    urgency: 'medium',
    status: 'open',
    priority: 'normal',
    requesterId: 'sample_user_1',
    requesterName: 'John Doe',
    estimatedDuration: 2,
    flexibility: 'flexible',
    requirements: ['Basic plumbing tools', 'New tap'],
    tags: ['plumbing', 'kitchen', 'repair'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'task_2',
    title: 'Home Deep Cleaning',
    description: 'Complete deep cleaning of 2BHK apartment including kitchen, bathrooms, living area, and bedrooms.',
    category: 'cleaning',
    subcategory: 'deep_cleaning',
    budget: 2500,
    budgetType: 'fixed',
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.4065], // Hyderabad coordinates
      address: 'Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    urgency: 'low',
    status: 'open',
    priority: 'normal',
    requesterId: 'sample_user_2',
    requesterName: 'Jane Smith',
    estimatedDuration: 4,
    flexibility: 'anytime',
    requirements: ['Cleaning supplies', 'Vacuum cleaner'],
    tags: ['cleaning', 'deep_cleaning', 'apartment'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'task_3',
    title: 'Assemble IKEA Furniture',
    description: 'Help assembling IKEA bookshelf and desk. All parts and tools are available.',
    category: 'assembly',
    subcategory: 'furniture',
    budget: 800,
    budgetType: 'fixed',
    location: {
      type: 'Point',
      coordinates: [78.4676, 17.3850], // Hyderabad coordinates
      address: 'Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India'
    },
    urgency: 'medium',
    status: 'open',
    priority: 'normal',
    requesterId: 'sample_user_3',
    requesterName: 'Mike Johnson',
    estimatedDuration: 3,
    flexibility: 'flexible',
    requirements: ['Basic tools', 'Assembly experience'],
    tags: ['assembly', 'furniture', 'IKEA'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Initialize with sample data
sampleTasks.forEach(task => {
  inMemoryTasks.set(task._id, task);
});

// Task Schema
const TaskSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: ['cleaning', 'repair', 'delivery', 'assembly', 'gardening', 'petcare', 'other'],
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  budget: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  budgetType: {
    type: String,
    enum: ['fixed', 'hourly', 'negotiable'],
    default: 'fixed'
  },
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
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true,
      index: true
    },
    state: {
      type: String,
      required: true
    },
    pinCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  requesterId: {
    type: String,
    required: true,
    index: true
  },
  requesterName: {
    type: String,
    required: true
  },
  assignedTo: {
    type: String,
    index: true
  },
  assignedToName: String,
  assignedAt: Date,
  estimatedDuration: {
    type: Number, // in hours
    min: 0.5,
    max: 168 // 1 week max
  },
  actualDuration: {
    type: Number, // in hours
    min: 0
  },
  scheduledDate: Date,
  scheduledTime: String,
  flexibility: {
    type: String,
    enum: ['strict', 'flexible', 'anytime'],
    default: 'flexible'
  },
  requirements: [String],
  attachments: [{
    type: String,
    url: String,
    filename: String,
    uploadedAt: Date
  }],
  tags: [String],
  isUrgent: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  applications: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  review: String,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for common queries
TaskSchema.index({ 'location.coordinates': '2dsphere' });
TaskSchema.index({ category: 1, status: 1 });
TaskSchema.index({ budget: 1, status: 1 });
TaskSchema.index({ urgency: 1, status: 1 });
TaskSchema.index({ createdAt: -1 });

// In-memory methods
TaskSchema.statics.findInMemory = function(query = {}) {
  let tasks = Array.from(inMemoryTasks.values());
  
  // Apply filters
  if (query.status) {
    tasks = tasks.filter(task => task.status === query.status);
  }
  if (query.category) {
    tasks = tasks.filter(task => task.category === query.category);
  }
  if (query.city) {
    tasks = tasks.filter(task => task.location.city === query.city);
  }
  if (query.maxBudget) {
    tasks = tasks.filter(task => task.budget <= query.maxBudget);
  }
  if (query.minBudget) {
    tasks = tasks.filter(task => task.budget >= query.minBudget);
  }
  
  return tasks;
};

TaskSchema.statics.findOneInMemory = function(query) {
  if (query._id) {
    return inMemoryTasks.get(query._id) || null;
  }
  // For other queries, return first match
  const tasks = this.findInMemory(query);
  return tasks.length > 0 ? tasks[0] : null;
};

TaskSchema.statics.createInMemory = function(taskData) {
  const task = { ...taskData, createdAt: new Date(), updatedAt: new Date() };
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  task._id = taskId;
  inMemoryTasks.set(taskId, task);
  return task;
};

// Helper function to create mock query results
function createMockQuery(result) {
  return {
    lean: function() {
      return result;
    },
    sort: function(sortObj) {
      // Handle sorting for arrays
      if (Array.isArray(result)) {
        const sorted = [...result].sort((a, b) => {
          for (const [key, order] of Object.entries(sortObj)) {
            const aVal = a[key];
            const bVal = b[key];
            if (aVal < bVal) return order === 1 ? -1 : 1;
            if (aVal > bVal) return order === 1 ? 1 : -1;
          }
          return 0;
        });
        return createMockQuery(sorted);
      }
      return this;
    },
    limit: function(limit) {
      // Handle limiting for arrays
      if (Array.isArray(result)) {
        const limited = result.slice(0, limit);
        return createMockQuery(limited);
      }
      return this;
    },
    skip: function(skip) {
      // Handle skipping for arrays
      if (Array.isArray(result)) {
        const skipped = result.slice(skip);
        return createMockQuery(skipped);
      }
      return this;
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
const Task = model('Task', TaskSchema);

// Store original methods before overriding
const originalFind = Task.find.bind(Task);
const originalFindOne = Task.findOne.bind(Task);
const originalFindById = Task.findById.bind(Task);
const originalCreate = Task.create.bind(Task);
const originalCountDocuments = Task.countDocuments.bind(Task);
const originalUpdateOne = Task.updateOne.bind(Task);

// Dynamic MongoDB connection check function
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

// Override methods with dynamic connection checking
Task.find = function(query = {}) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.find');
    return originalFind(query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.find');
    const result = Task.findInMemory(query);
    return createMockQuery(result);
  }
};

Task.findOne = function(query) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.findOne');
    return originalFindOne(query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findOne');
    const result = Task.findOneInMemory(query);
    return createMockQuery(result);
  }
};

Task.findById = function(id) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.findById');
    return originalFindById(id);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findById');
    const result = Task.findOneInMemory({ _id: id });
    return createMockQuery(result);
  }
};

Task.create = function(taskData) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.create');
    return originalCreate(taskData);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.create');
    return Task.createInMemory(taskData);
  }
};

Task.countDocuments = function(query = {}) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.countDocuments');
    return originalCountDocuments(query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.countDocuments');
    const tasks = Array.from(inMemoryTasks.values());
    let filteredTasks = tasks;
    if (query.status) {
      filteredTasks = tasks.filter(task => task.status === query.status);
    }
    return Promise.resolve(filteredTasks.length);
  }
};

Task.updateOne = function(query, update) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.updateOne');
    return originalUpdateOne(query, update);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.updateOne');
    const taskId = query._id;
    if (!taskId) {
      return createMockQuery({ modifiedCount: 0 });
    }
    
    const existingTask = inMemoryTasks.get(taskId);
    if (!existingTask) {
      return createMockQuery({ modifiedCount: 0 });
    }
    
    const updatedTask = {
      ...existingTask,
      ...update,
      updatedAt: new Date()
    };
    
    inMemoryTasks.set(taskId, updatedTask);
    return createMockQuery({ modifiedCount: 1 });
  }
};

module.exports = Task;

