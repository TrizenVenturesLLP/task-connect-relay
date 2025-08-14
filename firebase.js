// Centralized Firebase Admin initialization for the standalone backend
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize using one of the following (in priority order):
// 1) Explicit env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// 2) Service account file path via FIREBASE_SERVICE_ACCOUNT_PATH or ./serviceAccountKey.json
// 3) GOOGLE_APPLICATION_CREDENTIALS / Application Default Credentials
if (!admin.apps.length) {
  let credential = undefined;

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_SERVICE_ACCOUNT_PATH,
  } = process.env;

  try {
    // 1) Env vars with raw private key
    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credential = admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      });
    } else {
      // 2) Local service account file
      const candidatePath = FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccountKey.json');
      if (fs.existsSync(candidatePath)) {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const serviceAccount = require(candidatePath);
        credential = admin.credential.cert(serviceAccount);
      }
    }
  } catch (e) {
    // Fall back to ADC if anything above fails
  }

  if (credential) {
    admin.initializeApp({ credential });
  } else {
    // 3) ADC (GOOGLE_APPLICATION_CREDENTIALS or GCP runtime)
    admin.initializeApp();
  }
}

const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };
