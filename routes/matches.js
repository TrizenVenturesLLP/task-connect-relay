const express = require('express');
const Task = require('../models/Task');
const Profile = require('../models/Profile');
const { haversineDistanceKm } = require('../lib/geo');

const router = express.Router();

// GET /api/v1/matches/tasks/:taskId/candidates?lat&lng&radiusKm
router.get('/tasks/:taskId/candidates', async (req, res) => {
  const { taskId } = req.params;
  const { lat, lng, radiusKm } = req.query;
  const task = await Task.findById(taskId).lean();
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const skills = Array.isArray(task.skillsRequired) ? task.skillsRequired : [];

  const candidates = await Profile.find({ roles: { $in: ['tasker'] } })
    .select('uid name photoURL location skills')
    .limit(200)
    .lean();

  const lt = Number(lat) || task.location?.lat;
  const ln = Number(lng) || task.location?.lng;
  const r = Number(radiusKm) || 50;

  const scored = candidates
    .filter((p) => p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number')
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
