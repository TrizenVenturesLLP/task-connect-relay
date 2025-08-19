const express = require('express');
const { auth } = require('../firebase');
const Profile = require('../models/Profile');

const router = express.Router();

// POST /api/v1/auth/signup
// Body: { email, password, displayName?, phoneNumber? }
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName, phoneNumber } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid payload: email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userRecord = await auth.createUser({ email, password, displayName, phoneNumber });

    // Minimal profile in MongoDB
    const now = Date.now();
    await Profile.updateOne(
      { uid: userRecord.uid },
      {
        $set: {
          uid: userRecord.uid,
          name: displayName ?? email.split('@')[0],
          email: email,
          roles: ['both'],
          userType: 'individual',
          location: null,
          skills: [],
          availability: null,
          phone: phoneNumber ?? null,
          photoURL: userRecord.photoURL ?? null,
          rating: null,
          agreeUpdates: false,
          agreeTerms: false,
          updatedAt: now,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    let emailVerificationLink = null;
    try {
      emailVerificationLink = await auth.generateEmailVerificationLink(email);
    } catch (_) {
      emailVerificationLink = null;
    }

    return res.json({ uid: userRecord.uid, email: userRecord.email, emailVerified: userRecord.emailVerified, emailVerificationLink });
  } catch (error) {
    const code = error?.code || 'unknown';
    const message = error?.message || 'Signup failed';
    return res.status(400).json({ error: message, code });
  }
});

// POST /api/v1/auth/password/reset
// Body: { email, continueUrl? }
router.post('/password/reset', async (req, res) => {
  try {
    const { email, continueUrl } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Invalid payload: email is required' });
    }
    const actionCodeSettings = continueUrl ? { url: continueUrl } : undefined;
    const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings);
    return res.json({ email, resetLink });
  } catch (error) {
    const code = error?.code || 'unknown';
    const message = error?.message || 'Could not generate reset link';
    return res.status(400).json({ error: message, code });
  }
});

// POST /api/v1/auth/login
// Body: { email, password }
// Returns: { idToken, refreshToken, expiresIn, localId, email }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    const baseUrl = emulatorHost
      ? `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=any`
      : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    if (!emulatorHost && !apiKey) {
      return res.status(500).json({ error: 'Missing FIREBASE_WEB_API_KEY in server env' });
    }

    const r = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await r.json();
    if (!r.ok) {
      const message = data?.error?.message || 'Login failed';
      return res.status(400).json({ error: message, code: data?.error?.code || 'auth/login-failed' });
    }
    return res.json({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      localId: data.localId,
      email: data.email,
    });
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Login failed' });
  }
});

module.exports = router;
