const express = require('express');
const Task = require('../models/Task');
const Profile = require('../models/Profile');
const TaskApplication = require('../models/TaskApplication');
const { haversineDistanceKm } = require('../lib/geo');

const router = express.Router();

// POST /api/v1/tasks - Create a new task
router.post('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { 
      type, 
      title,
      description, 
      location, 
      preferredTime, 
      budget, 
      skillsRequired,
      priority,
      estimatedDuration,
      images,
      isUrgent
    } = req.body || {};
    
    // Validate required fields
    if (!type || !title || !description || !location || !budget) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid location coordinates' });
    }
    
    // Set expiration date (default 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create task with enhanced structure
    const taskData = {
      creatorUid: uid,
      type,
      title,
      description,
      location: {
        type: 'Point',
        coordinates: [location.coordinates[1], location.coordinates[0]], // [lng, lat]
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        postalCode: location.postalCode
      },
      preferredTime: preferredTime || { flexible: true },
      budget: {
        amount: Number(budget.amount || budget),
        currency: budget.currency || 'INR',
        negotiable: budget.negotiable !== false
      },
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired.slice(0, 20) : [],
      priority: priority || 'medium',
      estimatedDuration: estimatedDuration || null,
      images: Array.isArray(images) ? images.slice(0, 10) : [],
      isUrgent: isUrgent || false,
      expiresAt
    };
    
    const doc = await Task.create(taskData);
    
    // Update user's total tasks count
    await Profile.updateOne(
      { uid },
      { $inc: { totalTasks: 1 } }
    );
    
    return res.json({ 
      id: String(doc._id), 
      ...doc.toObject(),
      message: 'Task created successfully'
    });
  } catch (e) {
    console.error('Task creation error:', e);
    return res.status(400).json({ error: 'Could not create task', details: e.message });
  }
});

// GET /api/v1/tasks - Get tasks with advanced filtering
router.get('/', async (req, res) => {
  try {
    const { 
      mine, 
      recommend, 
      lat, 
      lng, 
      radiusKm, 
      limit,
      status,
      type,
      city,
      minBudget,
      maxBudget,
      skills,
      sortBy,
      page
    } = req.query;
    const uid = req.user.uid;
    const pageSize = Math.min(Number(limit) || 20, 100);
    const pageNum = Number(page) || 1;
    const skip = (pageNum - 1) * pageSize;

    // Build query
    let query = {};
    
    // My tasks (creator or assignee)
    if (mine === 'creator') {
      query.creatorUid = uid;
    } else if (mine === 'assignee') {
      query.assigneeUid = uid;
    } else if (mine === 'all') {
      query.$or = [{ creatorUid: uid }, { assigneeUid: uid }];
    }

    // Status filter
    if (status && ['open', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // City filter
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    // Budget range filter
    if (minBudget || maxBudget) {
      query['budget.amount'] = {};
      if (minBudget) query['budget.amount'].$gte = Number(minBudget);
      if (maxBudget) query['budget.amount'].$lte = Number(maxBudget);
    }

    // Skills filter
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      query.skillsRequired = { $in: skillsArray };
    }

    // Recommendations based on profile skills + distance
    if (String(recommend) === 'true') {
      const profile = await Profile.findOne({ uid }).lean();
      if (profile) {
        const mySkills = Array.isArray(profile.skills) ? profile.skills : [];
        const userLocation = profile.location?.coordinates;
        
        if (userLocation && mySkills.length > 0) {
          // Find tasks with matching skills within radius
          const radius = Number(radiusKm) || 50;
          const maxDistance = radius * 1000; // Convert to meters
          
          query['location.coordinates'] = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: userLocation
              },
              $maxDistance: maxDistance
            }
          };
          
          query.skillsRequired = { $in: mySkills };
          query.status = 'open';
        }
      }
    }

    // Build sort options
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'budget_asc') sortOptions = { 'budget.amount': 1 };
    else if (sortBy === 'budget_desc') sortOptions = { 'budget.amount': -1 };
    else if (sortBy === 'distance') sortOptions = { createdAt: -1 }; // Will be sorted after distance calculation
    else if (sortBy === 'urgent') sortOptions = { isUrgent: -1, createdAt: -1 };

    // Execute query
    const docs = await Task.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Calculate distances if needed
    let results = docs.map(d => ({ id: String(d._id), ...d }));
    
    if (String(recommend) === 'true' && (lat || lng)) {
      const userLat = Number(lat);
      const userLng = Number(lng);
      
      results = results.map(task => {
        if (task.location?.coordinates) {
          const distanceKm = haversineDistanceKm(
            userLat, 
            userLng, 
            task.location.coordinates[1], 
            task.location.coordinates[0]
          );
          return { ...task, distanceKm };
        }
        return task;
      });
      
      // Sort by distance if requested
      if (sortBy === 'distance') {
        results.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
      }
    }

    // Get total count for pagination
    const total = await Task.countDocuments(query);

    return res.json({
      tasks: results,
      pagination: {
        page: pageNum,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (e) {
    console.error('Task fetch error:', e);
    return res.status(400).json({ error: 'Could not fetch tasks', details: e.message });
  }
});

// GET /api/v1/tasks/:id - Get specific task with details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    
    const doc = await Task.findById(id).lean();
    if (!doc) return res.status(404).json({ error: 'Task not found' });
    
    // Increment view count
    await Task.updateOne({ _id: id }, { $inc: { views: 1 } });
    
    // Get creator profile
    const creator = await Profile.findOne({ uid: doc.creatorUid })
      .select('name photoURL rating totalReviews isVerified')
      .lean();
    
    // Get applications count
    const applicationsCount = await TaskApplication.countDocuments({ 
      taskId: id, 
      status: 'pending' 
    });
    
    const result = {
      id: String(doc._id),
      ...doc,
      creator,
      applicationsCount
    };
    
    return res.json(result);
  } catch (e) {
    console.error('Task fetch error:', e);
    return res.status(400).json({ error: 'Could not fetch task', details: e.message });
  }
});

// POST /api/v1/tasks/:id/accept - Accept a task
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (task.status !== 'open') {
      return res.status(400).json({ error: 'Task is not available for assignment' });
    }
    
    if (task.creatorUid === uid) {
      return res.status(400).json({ error: 'Cannot accept your own task' });
    }
    
    // Check if user has already applied
    const existingApplication = await TaskApplication.findOne({
      taskId: id,
      applicantUid: uid,
      status: 'accepted'
    });
    
    if (!existingApplication) {
      return res.status(400).json({ error: 'You must apply and be accepted before accepting this task' });
    }
    
    task.status = 'assigned';
    task.assigneeUid = uid;
    task.updatedAt = new Date();
    await task.save();
    
    // Update user's assigned tasks count
    await Profile.updateOne(
      { uid },
      { $inc: { totalTasks: 1 } }
    );
    
    return res.json({ 
      id: String(task._id), 
      ...task.toObject(),
      message: 'Task accepted successfully'
    });
  } catch (e) {
    console.error('Task acceptance error:', e);
    return res.status(400).json({ error: e.message || 'Could not accept task' });
  }
});

// POST /api/v1/tasks/:id/complete - Complete a task
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { proofs, comment, rating } = req.body || {};
    
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (task.status !== 'assigned' && task.status !== 'in_progress') {
      return res.status(400).json({ error: 'Task is not in progress' });
    }
    
    if (task.assigneeUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to complete this task' });
    }
    
    task.status = 'completed';
    task.completion = {
      proofs: Array.isArray(proofs) ? proofs.slice(0, 10) : [],
      comment: comment || null,
      completedAt: new Date()
    };
    task.updatedAt = new Date();
    await task.save();
    
    // Update user's completed tasks count
    await Profile.updateOne(
      { uid },
      { $inc: { completedTasks: 1 } }
    );
    
    return res.json({ 
      id: String(task._id), 
      ...task.toObject(),
      message: 'Task completed successfully'
    });
  } catch (e) {
    console.error('Task completion error:', e);
    return res.status(400).json({ error: e.message || 'Could not complete task' });
  }
});

// PUT /api/v1/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const updateData = req.body;
    
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (task.creatorUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }
    
    if (task.status !== 'open') {
      return res.status(400).json({ error: 'Cannot update task that is not open' });
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.creatorUid;
    delete updateData.assigneeUid;
    delete updateData.status;
    delete updateData.createdAt;
    
    Object.assign(task, updateData);
    task.updatedAt = new Date();
    await task.save();
    
    return res.json({ 
      id: String(task._id), 
      ...task.toObject(),
      message: 'Task updated successfully'
    });
  } catch (e) {
    console.error('Task update error:', e);
    return res.status(400).json({ error: e.message || 'Could not update task' });
  }
});

// DELETE /api/v1/tasks/:id - Cancel/delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (task.creatorUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }
    
    if (task.status !== 'open') {
      return res.status(400).json({ error: 'Cannot delete task that is not open' });
    }
    
    task.status = 'cancelled';
    task.updatedAt = new Date();
    await task.save();
    
    return res.json({ 
      message: 'Task cancelled successfully'
    });
  } catch (e) {
    console.error('Task deletion error:', e);
    return res.status(400).json({ error: e.message || 'Could not delete task' });
  }
});

module.exports = router;
