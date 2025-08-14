const express = require('express');
const Task = require('../models/Task');
const { haversineDistanceKm } = require('../lib/geo');

const router = express.Router();

// POST /api/v1/tasks
router.post('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { type, description, location, preferredTime, budget, skillsRequired } = req.body || {};
    if (!type || !description || !location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const now = Date.now();
    const doc = await Task.create({
      creatorUid: uid,
      assigneeUid: null,
      type,
      description,
      location,
      preferredTime: preferredTime ?? null,
      budget: budget ?? null,
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired.slice(0, 20) : [],
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    return res.json({ id: String(doc._id), ...doc.toObject() });
  } catch (e) {
    return res.status(400).json({ error: 'Could not create task' });
  }
});

// GET /api/v1/tasks
router.get('/', async (req, res) => {
  try {
    const { mine, recommend, lat, lng, radiusKm, limit } = req.query;
    const uid = req.user.uid;

    // My tasks (creator or assignee)
    if (mine === 'creator') {
      const docs = await Task.find({ creatorUid: uid }).sort({ createdAt: -1 }).limit(100).lean();
      return res.json(docs.map((d) => ({ id: String(d._id), ...d })));
    }
    if (mine === 'assignee') {
      const docs = await Task.find({ assigneeUid: uid }).sort({ createdAt: -1 }).limit(100).lean();
      return res.json(docs.map((d) => ({ id: String(d._id), ...d })));
    }

    // Recommendations based on profile skills + distance
    if (String(recommend) === 'true') {
      const prof = await db.collection('profiles').doc(uid).get();
      const me = prof.data() || {};
      const mySkills = Array.isArray(me.skills) ? me.skills : [];
      const lt = Number(lat) || me?.location?.lat;
      const ln = Number(lng) || me?.location?.lng;
      const r = Number(radiusKm) || 50;

      const tsnap = await db.collection('tasks').where('status', '==', 'open').orderBy('createdAt', 'desc').limit(Number(limit) || 200).get();
      const tasks = tsnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const scored = tasks
        .filter((t) => t.location && typeof t.location.lat === 'number' && typeof t.location.lng === 'number')
        .map((t) => {
          const distanceKm = typeof lt === 'number' && typeof ln === 'number' ? haversineDistanceKm(lt, ln, t.location.lat, t.location.lng) : 9999;
          const skillOverlap = (t.skillsRequired || []).filter((s) => mySkills.includes(s)).length;
          const score = skillOverlap * 10 + Math.max(0, 50 - distanceKm);
          return { ...t, distanceKm, skillOverlap, _score: score };
        })
        .filter((t) => t.distanceKm <= r)
        .sort((a, b) => b._score - a._score)
        .slice(0, Number(limit) || 50);

      return res.json(scored);
    }

    // General listing
    const docs = await Task.find({}).sort({ createdAt: -1 }).limit(Number(limit) || 100).lean();
    return res.json(docs.map((d) => ({ id: String(d._id), ...d })));
  } catch (e) {
    return res.status(400).json({ error: 'Could not fetch tasks' });
  }
});

// GET /api/v1/tasks/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const doc = await Task.findById(id).lean();
  if (!doc) return res.status(404).json({ error: 'Task not found' });
  return res.json({ id: String(doc._id), ...doc });
});

// POST /api/v1/tasks/:id/accept
router.post('/:id/accept', async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;
  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'open') return res.status(400).json({ error: 'Task not open' });
    task.status = 'assigned';
    task.assigneeUid = uid;
    task.updatedAt = Date.now();
    await task.save();
    return res.json({ id: String(task._id), ...task.toObject() });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Could not accept task' });
  }
});

// POST /api/v1/tasks/:id/complete
router.post('/:id/complete', async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;
  const { proofs, comment } = req.body || {};
  try {
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status !== 'assigned') return res.status(400).json({ error: 'Task not assigned' });
    if (task.assigneeUid !== uid) return res.status(403).json({ error: 'Not authorized' });
    task.status = 'completed';
    task.proofs = Array.isArray(proofs) ? proofs.slice(0, 10) : [];
    task.completionComment = comment ?? null;
    task.updatedAt = Date.now();
    await task.save();
    return res.json({ id: String(task._id), ...task.toObject() });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Could not complete task' });
  }
});

module.exports = router;
