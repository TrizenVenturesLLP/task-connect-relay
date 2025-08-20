const express = require('express');
const Task = require('../models/Task');
const Profile = require('../models/Profile');
const { haversineDistanceKm } = require('../lib/geo');

const router = express.Router();

// GET /api/v1/dev/tasks - Get tasks without authentication (development only)
router.get('/', async (req, res) => {
  try {
    const { 
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
    
    const pageSize = Math.min(Number(limit) || 20, 100);
    const pageNum = Number(page) || 1;
    const skip = (pageNum - 1) * pageSize;

    // Build query
    let query = {};
    
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

    // Build sort options
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'budget_asc') sortOptions = { 'budget.amount': 1 };
    else if (sortBy === 'budget_desc') sortOptions = { 'budget.amount': -1 };
    else if (sortBy === 'urgent') sortOptions = { isUrgent: -1, createdAt: -1 };

    // Execute query
    const docs = await Task.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Transform results
    let results = docs.map(d => ({ id: String(d._id), ...d }));

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
    console.error('Dev task fetch error:', e);
    return res.status(400).json({ error: 'Could not fetch tasks', details: e.message });
  }
});

// GET /api/v1/dev/tasks/:id - Get specific task without authentication (development only)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await Task.findById(id).lean();
    if (!doc) return res.status(404).json({ error: 'Task not found' });
    
    // Increment view count
    await Task.updateOne({ _id: id }, { $inc: { views: 1 } });
    
    return res.json({ id: String(doc._id), ...doc });
  } catch (e) {
    console.error('Dev task fetch error:', e);
    return res.status(400).json({ error: 'Could not fetch task', details: e.message });
  }
});

module.exports = router;
