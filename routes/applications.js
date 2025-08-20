const express = require('express');
const TaskApplication = require('../models/TaskApplication');
const Task = require('../models/Task');
const Profile = require('../models/Profile');

const router = express.Router();

// POST /api/v1/applications - Submit application for a task
router.post('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { 
      taskId, 
      proposedBudget, 
      proposedTime, 
      coverLetter, 
      relevantExperience, 
      portfolio 
    } = req.body || {};
    
    // Validate required fields
    if (!taskId || !proposedBudget) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if task exists and is open
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.status !== 'open') {
      return res.status(400).json({ error: 'Task is not open for applications' });
    }
    
    if (task.creatorUid === uid) {
      return res.status(400).json({ error: 'Cannot apply to your own task' });
    }
    
    // Check if user has already applied
    const existingApplication = await TaskApplication.findOne({
      taskId,
      applicantUid: uid
    });
    
    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied to this task' });
    }
    
    // Create application
    const application = await TaskApplication.create({
      taskId,
      applicantUid: uid,
      proposedBudget: {
        amount: Number(proposedBudget.amount || proposedBudget),
        currency: proposedBudget.currency || 'INR',
        isNegotiable: proposedBudget.isNegotiable !== false
      },
      proposedTime: proposedTime || { flexible: true },
      coverLetter: coverLetter || '',
      relevantExperience: Array.isArray(relevantExperience) ? relevantExperience : [],
      portfolio: Array.isArray(portfolio) ? portfolio : []
    });
    
    // Increment task applications count
    await Task.updateOne(
      { _id: taskId },
      { $inc: { applications: 1 } }
    );
    
    return res.json({
      id: String(application._id),
      ...application.toObject(),
      message: 'Application submitted successfully'
    });
  } catch (e) {
    console.error('Application creation error:', e);
    return res.status(400).json({ error: 'Could not submit application', details: e.message });
  }
});

// GET /api/v1/applications - Get applications (for task creator or applicant)
router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { 
      taskId, 
      status, 
      mine, 
      limit, 
      page 
    } = req.query;
    
    const pageSize = Math.min(Number(limit) || 20, 100);
    const pageNum = Number(page) || 1;
    const skip = (pageNum - 1) * pageSize;
    
    let query = {};
    
    // Get applications for a specific task (task creator only)
    if (taskId) {
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      if (task.creatorUid !== uid) {
        return res.status(403).json({ error: 'Not authorized to view applications for this task' });
      }
      
      query.taskId = taskId;
    }
    
    // Get my applications
    if (mine === 'true') {
      query.applicantUid = uid;
    }
    
    // Status filter
    if (status && ['pending', 'accepted', 'rejected', 'withdrawn'].includes(status)) {
      query.status = status;
    }
    
    // Execute query
    const applications = await TaskApplication.find(query)
      .populate('taskId', 'title type budget location status')
      .populate('applicantUid', 'name photoURL rating totalReviews skills')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();
    
    // Get total count for pagination
    const total = await TaskApplication.countDocuments(query);
    
    const results = applications.map(app => ({
      id: String(app._id),
      ...app
    }));
    
    return res.json({
      applications: results,
      pagination: {
        page: pageNum,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (e) {
    console.error('Application fetch error:', e);
    return res.status(400).json({ error: 'Could not fetch applications', details: e.message });
  }
});

// GET /api/v1/applications/:id - Get specific application
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    
    const application = await TaskApplication.findById(id)
      .populate('taskId', 'title type budget location status creatorUid')
      .populate('applicantUid', 'name photoURL rating totalReviews skills')
      .lean();
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Check authorization
    const isCreator = application.taskId.creatorUid === uid;
    const isApplicant = application.applicantUid.uid === uid;
    
    if (!isCreator && !isApplicant) {
      return res.status(403).json({ error: 'Not authorized to view this application' });
    }
    
    return res.json({
      id: String(application._id),
      ...application
    });
  } catch (e) {
    console.error('Application fetch error:', e);
    return res.status(400).json({ error: 'Could not fetch application', details: e.message });
  }
});

// PUT /api/v1/applications/:id - Update application status (task creator only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { status, message } = req.body || {};
    
    const application = await TaskApplication.findById(id)
      .populate('taskId', 'creatorUid status');
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Only task creator can update application status
    if (application.taskId.creatorUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to update this application' });
    }
    
    // Validate status transition
    if (status === 'accepted') {
      if (application.taskId.status !== 'open') {
        return res.status(400).json({ error: 'Task is not open for assignment' });
      }
      
      // Reject all other pending applications for this task
      await TaskApplication.updateMany(
        { 
          taskId: application.taskId._id, 
          _id: { $ne: id },
          status: 'pending'
        },
        { status: 'rejected' }
      );
      
      // Update task status to assigned
      await Task.updateOne(
        { _id: application.taskId._id },
        { 
          status: 'assigned',
          assigneeUid: application.applicantUid,
          updatedAt: new Date()
        }
      );
    }
    
    // Update application status
    application.status = status;
    application.updatedAt = new Date();
    
    // Add message if provided
    if (message) {
      application.messages.push({
        senderUid: uid,
        message,
        timestamp: new Date(),
        isRead: false
      });
    }
    
    await application.save();
    
    return res.json({
      id: String(application._id),
      ...application.toObject(),
      message: 'Application updated successfully'
    });
  } catch (e) {
    console.error('Application update error:', e);
    return res.status(400).json({ error: 'Could not update application', details: e.message });
  }
});

// POST /api/v1/applications/:id/message - Add message to application
router.post('/:id/message', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    const { message } = req.body || {};
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const application = await TaskApplication.findById(id)
      .populate('taskId', 'creatorUid');
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Check authorization (only applicant or task creator can message)
    const isCreator = application.taskId.creatorUid === uid;
    const isApplicant = application.applicantUid === uid;
    
    if (!isCreator && !isApplicant) {
      return res.status(403).json({ error: 'Not authorized to message this application' });
    }
    
    // Add message
    await application.addMessage(uid, message.trim());
    
    return res.json({
      message: 'Message sent successfully'
    });
  } catch (e) {
    console.error('Message send error:', e);
    return res.status(400).json({ error: 'Could not send message', details: e.message });
  }
});

// DELETE /api/v1/applications/:id - Withdraw application (applicant only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;
    
    const application = await TaskApplication.findById(id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Only applicant can withdraw
    if (application.applicantUid !== uid) {
      return res.status(403).json({ error: 'Not authorized to withdraw this application' });
    }
    
    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot withdraw non-pending application' });
    }
    
    application.status = 'withdrawn';
    application.updatedAt = new Date();
    await application.save();
    
    return res.json({
      message: 'Application withdrawn successfully'
    });
  } catch (e) {
    console.error('Application withdrawal error:', e);
    return res.status(400).json({ error: 'Could not withdraw application', details: e.message });
  }
});

module.exports = router;
