const express = require('express');
const { db } = require('../firebase');
const { haversineDistanceKm } = require('../lib/geo');

const router = express.Router();

// GET /api/v1/matches/tasks/:taskId/candidates?lat&lng&radiusKm
router.get('/tasks/:taskId/candidates', async (req, res) => {
  const { taskId } = req.params;
  const { lat, lng, radiusKm } = req.query;
  const tdoc = await db.collection('tasks').doc(taskId).get();
  if (!tdoc.exists) return res.status(404).json({ error: 'Task not found' });
  const task = tdoc.data();
  const skills = Array.isArray(task.skillsRequired) ? task.skillsRequired : [];

  let q = db.collection('profiles').where('roles', 'array-contains', 'tasker');
  if (skills.length) q = q.where('skills', 'array-contains-any', skills.slice(0, 10));
  const snap = await q.limit(200).get();
  const candidates = snap.docs
    .map((d) => d.data())
    .filter((p) => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number');

  const lt = Number(lat) || task.location?.lat;
  const ln = Number(lng) || task.location?.lng;
  const r = Number(radiusKm) || 50;

  const scored = candidates
    .map((p) => {
      const distanceKm = haversineDistanceKm(lt, ln, p.location.lat, p.location.lng);
      const skillOverlap = (p.skills || []).filter((s) => skills.includes(s)).length;
      const score = skillOverlap * 10 + Math.max(0, 50 - distanceKm);
      return { uid: p.uid, name: p.name, photoURL: p.photoURL, distanceKm, skillOverlap, score };
    })
    .filter((c) => c.distanceKm <= r)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  return res.json(scored);
});

module.exports = router;
