// Centralized Firebase Admin initialization for the standalone backend
const admin = require('firebase-admin');

// Initialize using Application Default Credentials or a provided service account
// For local dev, set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };
