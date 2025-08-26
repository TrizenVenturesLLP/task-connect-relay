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

// GET /api/v1/profiles/onboarding-status
router.get('/onboarding-status', async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await Profile.findOne({ uid }).lean();
    
    if (!doc) {
      return res.json({
        isCompleted: false,
        completedSteps: {
          location: false,
          roles: false,
          profile: false
        },
        lastStep: 'location'
      });
    }
    
    return res.json(doc.onboardingStatus || {
      isCompleted: false,
      completedSteps: {
        location: false,
        roles: false,
        profile: false
      },
      lastStep: 'location'
    });
  } catch (error) {
    console.error('❌ Error getting onboarding status:', error);
    return res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

// POST /api/v1/profiles
router.post('/', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.uid) {
      console.error('❌ No authenticated user found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const uid = req.user.uid;
    console.log('💾 Profile save request for user:', uid);
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('📝 Content-Type:', req.headers['content-type']);
    
    // Filter out server-generated fields that shouldn't be sent by client
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
      agreeTerms = false,
      // Ignore these server-generated fields
      id, uid: clientUid, createdAt, updatedAt, ...rest
    } = req.body || {};
    
    // Log any unexpected fields
    if (Object.keys(rest).length > 0) {
      console.warn('⚠️ Unexpected fields in request body:', Object.keys(rest));
    }
    
    console.log('🔍 Validation check:', { 
      hasName: !!name, 
      hasRoles: !!roles, 
      isRolesArray: Array.isArray(roles),
      rolesValue: roles,
      nameValue: name
    });
    
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
  
  // Determine onboarding status based on provided data
  const hasLocation = !!processedLocation;
  const hasRoles = Array.isArray(roles) && roles.length > 0;
  const hasProfile = !!(name && email);
  
  const onboardingStatus = {
    isCompleted: hasLocation && hasRoles && hasProfile,
    completedSteps: {
      location: hasLocation,
      roles: hasRoles,
      profile: hasProfile
    },
    completedAt: (hasLocation && hasRoles && hasProfile) ? now : null,
    lastStep: hasProfile ? 'profile' : hasRoles ? 'roles' : hasLocation ? 'location' : 'location'
  };
  
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
    onboardingStatus,
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
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to save profile', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
