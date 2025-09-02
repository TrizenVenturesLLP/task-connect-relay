const express = require('express');
const Profile = require('../models/Profile');

const router = express.Router();

// GET /api/v1/profiles/me
router.get('/me', async (req, res) => {
  try {
    const uid = req.user.uid;
    console.log('🔍 Looking up profile for user:', uid);
    
    const doc = await Profile.findOne({ uid }).lean();
    if (!doc) {
      console.log('⚠️ Profile not found for user:', uid);
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'User profile has not been created yet. Please complete the onboarding process.'
      });
    }
    
    console.log('✅ Profile found for user:', uid);
    return res.json({ id: doc.uid, ...doc });
  } catch (error) {
    console.error('❌ Error looking up profile:', error);
    return res.status(500).json({ error: 'Failed to lookup profile' });
  }
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
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to continue'
      });
    }
    
    const uid = req.user.uid;
    console.log('💾 Profile save request for user:', uid);
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate request body
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
    
    // Check if profile already exists
    const existingProfile = await Profile.findOne({ uid }).lean();
    console.log('🔍 Existing profile check:', { 
      exists: !!existingProfile, 
      hasLocation: !!existingProfile?.location,
      hasRoles: !!existingProfile?.roles,
      hasName: !!existingProfile?.name
    });
    
    // Process location data to match the Profile model structure
    let processedLocation = null;
    if (location && location.coordinates) {
      processedLocation = {
        type: 'Point',
        coordinates: location.coordinates,
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
      
      console.log('🔍 Processed location:', JSON.stringify(processedLocation, null, 2));
    } else if (location) {
      console.log('⚠️ Location data provided but missing coordinates:', location);
    }
    
    const now = Date.now();
    
    // Determine what data we have for this update
    const hasLocation = !!processedLocation;
    const hasRoles = Array.isArray(roles) && roles.length > 0;
    const hasName = !!name;
    const hasEmail = !!email;
    
    console.log('🔍 Data validation:', { 
      hasLocation, 
      hasRoles, 
      hasName, 
      hasEmail,
      locationProvided: !!location,
      rolesProvided: !!roles,
      nameProvided: !!name,
      emailProvided: !!email
    });
    
    // Build onboarding status based on existing data and new data
    const currentOnboardingStatus = existingProfile?.onboardingStatus || {
      isCompleted: false,
      completedSteps: { location: false, roles: false, profile: false },
      lastStep: 'location'
    };
    
    // Update completed steps based on what we have
    const updatedCompletedSteps = {
      location: hasLocation || currentOnboardingStatus.completedSteps.location,
      roles: hasRoles || currentOnboardingStatus.completedSteps.roles,
      profile: (hasName && hasEmail) || currentOnboardingStatus.completedSteps.profile
    };
    
    // Determine if onboarding is complete
    // For basic functionality, we need location + roles
    // Name/email can be added later without affecting core functionality
    const isOnboardingComplete = updatedCompletedSteps.location && updatedCompletedSteps.roles;
    
    // Determine the last completed step
    let lastStep = currentOnboardingStatus.lastStep;
    if (hasLocation) lastStep = 'location';
    if (hasRoles) lastStep = 'roles';
    if (hasName && hasEmail) lastStep = 'profile';
    
    const onboardingStatus = {
      isCompleted: isOnboardingComplete,
      completedSteps: updatedCompletedSteps,
      completedAt: isOnboardingComplete ? now : null,
      lastStep: lastStep
    };
    
    console.log('🔍 Onboarding status calculation:', {
      current: currentOnboardingStatus,
      updated: onboardingStatus,
      isComplete: isOnboardingComplete
    });
    
    // Build payload with only provided fields (partial update support)
    const payload = { 
      uid, 
      updatedAt: now,
      onboardingStatus
    };
    
    // Only add fields that are provided
    if (name) payload.name = name;
    if (email !== undefined) payload.email = email;
    if (roles) payload.roles = roles;
    if (userType) payload.userType = userType;
    if (processedLocation) payload.location = processedLocation;
    if (skills) payload.skills = Array.isArray(skills) ? skills.map((s) => String(s).toLowerCase().trim()).slice(0, 50) : [];
    if (availability !== undefined) payload.availability = availability;
    if (phone !== undefined) payload.phone = phone;
    if (photoURL !== undefined) payload.photoURL = photoURL;
    if (business !== undefined) payload.business = business;
    if (agreeUpdates !== undefined) payload.agreeUpdates = agreeUpdates;
    if (agreeTerms !== undefined) payload.agreeTerms = agreeTerms;
    
    // Set createdAt only for new profiles
    if (!existingProfile) {
      payload.createdAt = now;
      console.log('🆕 Creating new profile for user:', uid);
    } else {
      console.log('🔄 Updating existing profile for user:', uid);
    }
    
    console.log('💾 Final payload:', JSON.stringify(payload, null, 2));
    
    // Save profile to database
    try {
      console.log('💾 Attempting to save profile to database...');
      console.log('🔍 Query:', { uid });
      console.log('🔍 Update operation:', { $set: payload });
      console.log('🔍 Options:', { upsert: true });
      
      const updateResult = await Profile.updateOne({ uid }, { $set: payload }, { upsert: true });
      console.log('✅ Profile update result:', updateResult);
      
      if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0) {
        console.warn('⚠️ Profile update returned 0 modifications - this might indicate an issue');
      }
      
      console.log('✅ Profile saved successfully to database');
      
      // Fetch the updated profile
      const savedProfile = await Profile.findOne({ uid }).lean();
      if (!savedProfile) {
        throw new Error('Profile was saved but could not be retrieved');
      }
      
      console.log('✅ Profile retrieved after save:', {
        uid: savedProfile.uid,
        hasLocation: !!savedProfile.location,
        hasRoles: !!savedProfile.roles,
        hasName: !!savedProfile.name,
        onboardingStatus: savedProfile.onboardingStatus
      });
      
      return res.json({ 
        id: uid, 
        ...savedProfile,
        message: existingProfile ? 'Profile updated successfully' : 'Profile created successfully'
      });
      
    } catch (dbError) {
      console.error('❌ Database error saving profile:', dbError);
      console.error('❌ Database error stack:', dbError.stack);
      return res.status(500).json({ 
        error: 'Failed to save profile to database',
        message: 'Your profile data could not be saved. Please try again.',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
    
  } catch (error) {
    console.error('❌ Error saving profile:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Provide user-friendly error messages
    let userMessage = 'Failed to save profile. Please try again.';
    let statusCode = 500;
    
    if (error.name === 'ValidationError') {
      userMessage = 'Invalid profile data. Please check your information and try again.';
      statusCode = 400;
    } else if (error.name === 'MongoError' && error.code === 11000) {
      userMessage = 'A profile with this information already exists.';
      statusCode = 409;
    }
    
    return res.status(statusCode).json({ 
      error: 'Failed to save profile', 
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
