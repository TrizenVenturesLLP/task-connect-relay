const express = require('express');
const Profile = require('../models/Profile');

const router = express.Router();

// GET /api/v1/profiles/me
router.get('/me', async (req, res) => {
  const uid = req.user.uid;
  const doc = await Profile.findOne({ uid }).lean();
  if (!doc) return res.status(404).json({ error: 'Profile not found' });
  return res.json({ id: doc.uid, ...doc });
});

// POST /api/v1/profiles
router.post('/', async (req, res) => {
  const uid = req.user.uid;
  const { name, roles, location, skills, availability, phone, photoURL } = req.body || {};
  if (!name || !roles || !Array.isArray(roles)) return res.status(400).json({ error: 'Invalid payload' });
  const now = Date.now();
  const payload = {
    uid,
    name,
    roles,
    location: location ?? null,
    skills: Array.isArray(skills) ? skills.map((s) => String(s).toLowerCase().trim()).slice(0, 50) : [],
    availability: availability ?? null,
    phone: phone ?? null,
    photoURL: photoURL ?? null,
    updatedAt: now,
    createdAt: now,
  };
  await Profile.updateOne({ uid }, { $set: payload }, { upsert: true });
  const saved = await Profile.findOne({ uid }).lean();
  return res.json({ id: uid, ...saved });
});

module.exports = router;
