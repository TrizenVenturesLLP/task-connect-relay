const express = require('express');
const { db } = require('../firebase');
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
    const ref = await db.collection('tasks').add({
      creator: uid,
      assignee: null,
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
    const doc = await ref.get();
    return res.json({ id: doc.id, ...doc.data() });
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
    if (mine === 'creator' || mine === 'assignee') {
      let q = db.collection('tasks');
      if (mine === 'creator') q = q.where('creator', '==', uid);
      if (mine === 'assignee') q = q.where('assignee', '==', uid);
      const snap = await q.orderBy('createdAt', 'desc').limit(100).get();
      return res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    const snap = await db.collection('tasks').orderBy('createdAt', 'desc').limit(Number(limit) || 100).get();
    return res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) {
    return res.status(400).json({ error: 'Could not fetch tasks' });
  }
});

// GET /api/v1/tasks/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const doc = await db.collection('tasks').doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Task not found' });
  return res.json({ id: doc.id, ...doc.data() });
});

// POST /api/v1/tasks/:id/accept
router.post('/:id/accept', async (req, res) => {
  const { id } = req.params;
  const uid = req.user.uid;
  try {
    await db.runTransaction(async (tx) => {
      const ref = db.collection('tasks').doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Task not found');
      const task = snap.data();
      if (task.status !== 'open') throw new Error('Task not open');
      tx.update(ref, { status: 'assigned', assignee: uid, updatedAt: Date.now() });
    });
    const updated = await db.collection('tasks').doc(id).get();
    return res.json({ id: updated.id, ...updated.data() });
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
    await db.runTransaction(async (tx) => {
      const ref = db.collection('tasks').doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Task not found');
      const task = snap.data();
      if (task.status !== 'assigned') throw new Error('Task not assigned');
      if (task.assignee !== uid) throw new Error('Not authorized');
      tx.update(ref, { status: 'completed', proofs: Array.isArray(proofs) ? proofs.slice(0, 10) : [], completionComment: comment ?? null, updatedAt: Date.now() });
    });
    const updated = await db.collection('tasks').doc(id).get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Could not complete task' });
  }
});

module.exports = router;
