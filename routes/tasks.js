const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

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
    
    let query = { creatorUid: req.user.uid };
    if (status) query.status = status;
    
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
    const taskData = {
      ...req.body,
      creatorUid: req.user.uid,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const task = await Task.create(taskData);
    res.status(201).json(task);
  } catch (error) {
    console.error('❌ Error creating task:', error);
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
