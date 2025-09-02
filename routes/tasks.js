const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

// Helper function to map frontend category values to backend enum values
function mapCategoryToEnum(frontendCategory) {
  if (!frontendCategory) return 'other';
  
  const categoryMap = {
    // Exact matches
    'cleaning': 'cleaning',
    'repair': 'repair',
    'delivery': 'delivery',
    'assembly': 'assembly',
    'gardening': 'gardening',
    'petcare': 'petcare',
    'other': 'other',
    
    // Frontend variations to backend enum
    'Cleaning': 'cleaning',
    'Repair': 'repair',
    'Delivery': 'delivery',
    'Assembly': 'assembly',
    'Gardening': 'gardening',
    'Pet Care': 'petcare',
    'Petcare': 'petcare',
    'Other': 'other',
    
    // Common variations
    'Home Services': 'other',
    'Home Cleaning': 'cleaning',
    'House Cleaning': 'cleaning',
    'Plumbing': 'repair',
    'Electrical': 'repair',
    'Carpentry': 'repair',
    'Moving': 'delivery',
    'Transport': 'delivery',
    'Furniture Assembly': 'assembly',
    'IKEA Assembly': 'assembly',
    'Garden Maintenance': 'gardening',
    'Pet Sitting': 'petcare',
    'Dog Walking': 'petcare',
    'General': 'other',
    'Miscellaneous': 'other'
  };
  
  // Try exact match first, then case-insensitive match
  const normalizedCategory = frontendCategory.toString().toLowerCase().trim();
  
  // Check exact match
  if (categoryMap[frontendCategory]) {
    return categoryMap[frontendCategory];
  }
  
  // Check normalized match
  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory];
  }
  
  // Check if it contains any of our keywords
  for (const [key, value] of Object.entries(categoryMap)) {
    if (normalizedCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedCategory)) {
      return value;
    }
  }
  
  // Default fallback
  console.log(`⚠️ Unknown category: "${frontendCategory}", defaulting to "other"`);
  return 'other';
}

// Get all tasks (with optional filtering)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, category, city, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;


    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (city) query['location.city'] = city;
    
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Task.countDocuments(query);
    
    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching tasks:', error);
    res.status(500).json({ error: 'Could not fetch tasks', details: error.message });
  }
});

// Get tasks posted by the current user
router.get('/my-tasks', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    console.log('🔍 My Tasks - User UID:', req.user.uid);
    console.log('🔍 My Tasks - Query params:', { status, limit, page, skip });
    
    let query = { creatorUid: req.user.uid };
    if (status) query.status = status;
    
    console.log('🔍 My Tasks - MongoDB query:', query);
    
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Task.countDocuments(query);
    
    console.log('🔍 My Tasks - Found tasks:', tasks.length);
    console.log('🔍 My Tasks - Total count:', total);
    
    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching user tasks:', error);
    res.status(500).json({ error: 'Could not fetch user tasks', details: error.message });
  }
});

// Get a single task by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).lean();
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('❌ Error fetching task:', error);
    res.status(500).json({ error: 'Could not fetch task', details: error.message });
  }
});

// Create a new task
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Creating task with data:', req.body);
    console.log('🔍 User UID:', req.user.uid);
    
    // Map frontend data to backend schema
    const frontendCategory = req.body.category || req.body.type;
    const mappedCategory = mapCategoryToEnum(frontendCategory);
    
    console.log(`🔍 Category mapping: "${frontendCategory}" → "${mappedCategory}"`);
    
    const taskData = {
      title: req.body.title,
      description: req.body.description,
      category: mappedCategory, // Map to valid enum
      subcategory: req.body.subcategory,
      budget: req.body.budget?.amount || req.body.budget, // Handle both object and number
      budgetType: req.body.budgetType || 'fixed',
      location: {
        type: 'Point',
        coordinates: req.body.location?.coordinates || [0, 0], // Default coordinates
        address: req.body.location?.address || req.body.location || 'Address not specified',
        city: req.body.location?.city || req.body.city || 'City not specified',
        state: req.body.location?.state || req.body.state || 'State not specified',
        country: req.body.location?.country || req.body.country || 'India'
      },
      urgency: req.body.urgency || 'medium',
      priority: req.body.priority || 'normal',
      requesterId: req.user.uid, // Use authenticated user's UID
      requesterName: req.body.requesterName || req.body.creatorName || 'Anonymous', // Fallback name
      creatorUid: req.user.uid,
      estimatedDuration: req.body.estimatedDuration || req.body.duration,
      flexibility: req.body.flexibility || 'flexible',
      requirements: req.body.requirements || req.body.skillsRequired || [],
      tags: req.body.tags || [],
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🔍 Mapped task data:', taskData);
    
    const task = await Task.create(taskData);
    console.log('✅ Task created successfully:', task._id);
    res.status(201).json(task);
  } catch (error) {
    console.error('❌ Error creating task:', error);
    
    // Provide better error messages
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => 
        `${key}: ${error.errors[key].message}`
      ).join(', ');
      
      return res.status(400).json({ 
        error: 'Task validation failed', 
        details: validationErrors,
        suggestions: {
          budget: 'Budget should be a number (e.g., 1000)',
          category: 'Category is required (e.g., cleaning, repair, delivery)',
          location: 'City and state are required',
          requesterName: 'Requester name is required'
        }
      });
    }
    
    res.status(500).json({ error: 'Could not create task', details: error.message });
  }
});

// Update a task (only by creator)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is the creator
    if (task.creatorUid !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to edit this task' });
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    
    res.json(updatedTask);
  } catch (error) {
    console.error('❌ Error updating task:', error);
    res.status(500).json({ error: 'Could not update task', details: error.message });
  }
});

// Delete a task (only by creator)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is the creator
    if (task.creatorUid !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }
    
    await Task.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    res.status(500).json({ error: 'Could not delete task', details: error.message });
  }
});

// Update task status (only by creator)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['open', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user is the creator
    if (task.creatorUid !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
    
    res.json(updatedTask);
  } catch (error) {
    console.error('❌ Error updating task status:', error);
    res.status(500).json({ error: 'Could not update task status', details: error.message });
  }
});

module.exports = router;
