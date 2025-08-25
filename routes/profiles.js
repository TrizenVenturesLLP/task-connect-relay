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
  try {
    const uid = req.user.uid;
    console.log('💾 Profile save request for user:', uid);
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      name, 
      roles, 
      location, 
      skills, 
      availability, 
      phone,
      photoURL,
      email,
      userType,
      business,
      agreeUpdates = false,
      agreeTerms = false
    } = req.body || {};
    
    if (!name || !roles || !Array.isArray(roles)) {
      console.error('❌ Invalid payload:', { name, roles });
      return res.status(400).json({ error: 'Invalid payload - name and roles array required' });
    }
  
  // Process location data to match the Profile model structure
  let processedLocation = null;
  if (location) {
    processedLocation = {
      type: 'Point',
      coordinates: location.coordinates || [location.lng || 0, location.lat || 0],
      address: location.address || null,
      addressDetails: {
        doorNo: location.doorNo || null,
        area: location.area || null,
        city: location.city || null,
        state: location.state || null,
        pinCode: location.pinCode || null,
        country: location.country || null
      },
      isPublic: true
    };
  }
  
  const now = Date.now();
  const payload = {
    uid,
    name,
    email: email ?? null,
    roles,
    userType: userType ?? 'individual',
    location: processedLocation,
    skills: Array.isArray(skills) ? skills.map((s) => String(s).toLowerCase().trim()).slice(0, 50) : [],
    availability: availability ?? null,
    phone: phone ?? null,
    photoURL: photoURL ?? null,
    business: business ?? null,
    agreeUpdates: agreeUpdates ?? false,
    agreeTerms: agreeTerms ?? false,
    updatedAt: now,
    createdAt: now,
  };
  
  console.log('💾 Saving profile with location:', processedLocation);
  
  await Profile.updateOne({ uid }, { $set: payload }, { upsert: true });
  const saved = await Profile.findOne({ uid }).lean();
  console.log('✅ Profile saved successfully:', { uid, hasLocation: !!saved.location });
  return res.json({ id: uid, ...saved });
  } catch (error) {
    console.error('❌ Error saving profile:', error);
    return res.status(500).json({ error: 'Failed to save profile', details: error.message });
  }
});

module.exports = router;
