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
    creatorUid: 'sample_user_1',
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
    creatorUid: 'sample_user_2',
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
    creatorUid: 'sample_user_3',
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
const originalUpdateMany = Task.updateMany.bind(Task);
const originalDeleteOne = Task.deleteOne.bind(Task);
const originalDeleteMany = Task.deleteMany.bind(Task);
const originalFindByIdAndUpdate = Task.findByIdAndUpdate.bind(Task);
const originalFindByIdAndDelete = Task.findByIdAndDelete.bind(Task);
const originalFindOneAndUpdate = Task.findOneAndUpdate.bind(Task);
const originalFindOneAndDelete = Task.findOneAndDelete.bind(Task);
const originalAggregate = Task.aggregate.bind(Task);
const originalDistinct = Task.distinct.bind(Task);

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

Task.updateMany = function(query, update) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.updateMany');
    return originalUpdateMany(query, update);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.updateMany');
    const tasks = Array.from(inMemoryTasks.values());
    let modifiedCount = 0;
    
    tasks.forEach(task => {
      if (Object.keys(query).every(key => task[key] === query[key])) {
        Object.assign(task, update, { updatedAt: new Date() });
        modifiedCount++;
      }
    });
    
    return createMockQuery({ modifiedCount });
  }
};

Task.deleteOne = function(query) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.deleteOne');
    return originalDeleteOne(query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.deleteOne');
    const taskId = query._id;
    if (!taskId) {
      return createMockQuery({ deletedCount: 0 });
    }
    
    const deleted = inMemoryTasks.delete(taskId);
    return createMockQuery({ deletedCount: deleted ? 1 : 0 });
  }
};

Task.deleteMany = function(query) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.deleteMany');
    return originalDeleteMany(query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.deleteMany');
    const tasks = Array.from(inMemoryTasks.values());
    let deletedCount = 0;
    
    tasks.forEach(task => {
      if (Object.keys(query).every(key => task[key] === query[key])) {
        inMemoryTasks.delete(task._id);
        deletedCount++;
      }
    });
    
    return createMockQuery({ deletedCount });
  }
};

Task.findByIdAndUpdate = function(id, update, options = {}) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.findByIdAndUpdate');
    return originalFindByIdAndUpdate(id, update, options);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findByIdAndUpdate');
    const existingTask = inMemoryTasks.get(id);
    if (!existingTask) {
      return createMockQuery(null);
    }
    
    const updatedTask = {
      ...existingTask,
      ...update,
      updatedAt: new Date()
    };
    
    inMemoryTasks.set(id, updatedTask);
    
    if (options.new) {
      return createMockQuery(updatedTask);
    } else {
      return createMockQuery(existingTask);
    }
  }
};

Task.findByIdAndDelete = function(id) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.findByIdAndDelete');
    return originalFindByIdAndDelete(id);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findByIdAndDelete');
    const existingTask = inMemoryTasks.get(id);
    if (!existingTask) {
      return createMockQuery(null);
    }
    
    inMemoryTasks.delete(id);
    return createMockQuery(existingTask);
  }
};

Task.findOneAndUpdate = function(query, update, options = {}) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.findOneAndUpdate');
    return originalFindOneAndUpdate(query, update, options);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findOneAndUpdate');
    const existingTask = Task.findOneInMemory(query);
    if (!existingTask) {
      return createMockQuery(null);
    }
    
    const updatedTask = {
      ...existingTask,
      ...update,
      updatedAt: new Date()
    };
    
    inMemoryTasks.set(existingTask._id, updatedTask);
    
    if (options.new) {
      return createMockQuery(updatedTask);
    } else {
      return createMockQuery(existingTask);
    }
  }
};

Task.findOneAndDelete = function(query) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.findOneAndDelete');
    return originalFindOneAndDelete(query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findOneAndDelete');
    const existingTask = Task.findOneInMemory(query);
    if (!existingTask) {
      return createMockQuery(null);
    }
    
    inMemoryTasks.delete(existingTask._id);
    return createMockQuery(existingTask);
  }
};

Task.aggregate = function(pipeline) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.aggregate');
    return originalAggregate(pipeline);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.aggregate');
    const tasks = Array.from(inMemoryTasks.values());
    
    // Simple aggregation simulation
    let result = tasks;
    
    for (const stage of pipeline) {
      if (stage.$match) {
        result = result.filter(task => {
          return Object.keys(stage.$match).every(key => {
            const value = stage.$match[key];
            if (typeof value === 'object' && value.$in) {
              return value.$in.includes(task[key]);
            }
            return task[key] === value;
          });
        });
      } else if (stage.$group) {
        // Simple grouping simulation
        const grouped = {};
        result.forEach(task => {
          const groupKey = task[stage.$group._id];
          if (!grouped[groupKey]) {
            grouped[groupKey] = [];
          }
          grouped[groupKey].push(task);
        });
        result = Object.entries(grouped).map(([key, items]) => ({
          _id: key,
          count: items.length,
          items: items
        }));
      } else if (stage.$sort) {
        result.sort((a, b) => {
          for (const [key, order] of Object.entries(stage.$sort)) {
            if (a[key] < b[key]) return order === 1 ? -1 : 1;
            if (a[key] > b[key]) return order === 1 ? 1 : -1;
          }
          return 0;
        });
      } else if (stage.$limit) {
        result = result.slice(0, stage.$limit);
      } else if (stage.$skip) {
        result = result.slice(stage.$skip);
      }
    }
    
    return createMockQuery(result);
  }
};

Task.distinct = function(field, query = {}) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.distinct');
    return originalDistinct(field, query);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.distinct');
    const tasks = Array.from(inMemoryTasks.values());
    
    // Apply query filter
    let filteredTasks = tasks;
    if (Object.keys(query).length > 0) {
      filteredTasks = tasks.filter(task => {
        return Object.keys(query).every(key => task[key] === query[key]);
      });
    }
    
    // Get distinct values
    const distinctValues = [...new Set(filteredTasks.map(task => task[field]))];
    return createMockQuery(distinctValues);
  }
};

// Additional useful methods
Task.exists = function(query) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.exists');
    return Task.countDocuments(query).then(count => count > 0);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.exists');
    const tasks = Array.from(inMemoryTasks.values());
    const exists = tasks.some(task => {
      return Object.keys(query).every(key => task[key] === query[key]);
    });
    return Promise.resolve(exists);
  }
};

Task.findByIdAndRemove = function(id) {
  if (isMongoConnected()) {
    // Use real MongoDB - call original method
    console.log('✅ Using real MongoDB for Task.findByIdAndRemove');
    return originalFindByIdAndDelete(id);
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findByIdAndRemove');
    const existingTask = inMemoryTasks.get(id);
    if (!existingTask) {
      return createMockQuery(null);
    }
    
    inMemoryTasks.delete(id);
    return createMockQuery(existingTask);
  }
};

// Helper method to get tasks by status
Task.findByStatus = function(status) {
  if (isMongoConnected()) {
    // Use real MongoDB
    console.log('✅ Using real MongoDB for Task.findByStatus');
    return Task.find({ status });
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findByStatus');
    const tasks = Array.from(inMemoryTasks.values());
    const filteredTasks = tasks.filter(task => task.status === status);
    return createMockQuery(filteredTasks);
  }
};

// Helper method to get tasks by category
Task.findByCategory = function(category) {
  if (isMongoConnected()) {
    // Use real MongoDB
    console.log('✅ Using real MongoDB for Task.findByCategory');
    return Task.find({ category });
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findByCategory');
    const tasks = Array.from(inMemoryTasks.values());
    const filteredTasks = tasks.filter(task => task.category === category);
    return createMockQuery(filteredTasks);
  }
};

// Helper method to get tasks by location (city)
Task.findByCity = function(city) {
  if (isMongoConnected()) {
    // Use real MongoDB
    console.log('✅ Using real MongoDB for Task.findByCity');
    return Task.find({ 'location.city': city });
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findByCity');
    const tasks = Array.from(inMemoryTasks.values());
    const filteredTasks = tasks.filter(task => task.location.city === city);
    return createMockQuery(filteredTasks);
  }
};

// Helper method to get tasks within budget range
Task.findByBudgetRange = function(minBudget, maxBudget) {
  if (isMongoConnected()) {
    // Use real MongoDB
    console.log('✅ Using real MongoDB for Task.findByBudgetRange');
    return Task.find({ 
      budget: { 
        $gte: minBudget, 
        $lte: maxBudget 
      } 
    });
  } else {
    // Use in-memory fallback
    console.log('⚠️ MongoDB not connected, using in-memory fallback for Task.findByBudgetRange');
    const tasks = Array.from(inMemoryTasks.values());
    const filteredTasks = tasks.filter(task => 
      task.budget >= minBudget && task.budget <= maxBudget
    );
    return createMockQuery(filteredTasks);
  }
};

module.exports = Task;

