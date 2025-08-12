const express = require('express');
const { db } = require('../firebase');

const router = express.Router();

// GET /api/v1/profiles/me
router.get('/me', async (req, res) => {
  const uid = req.user.uid;
  const doc = await db.collection('profiles').doc(uid).get();
  if (!doc.exists) return res.status(404).json({ error: 'Profile not found' });
  return res.json({ id: doc.id, ...doc.data() });
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
    rating: null,
    updatedAt: now,
    createdAt: now,
  };
  await db.collection('profiles').doc(uid).set(payload, { merge: true });
  const saved = await db.collection('profiles').doc(uid).get();
  return res.json({ id: uid, ...saved.data() });
});

module.exports = router;
