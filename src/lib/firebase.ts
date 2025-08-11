// Minimal, safe Firebase client initialization
// Fill in your Firebase web config below (public keys are safe to commit)
import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// TODO: Replace with your actual Firebase web config
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

if (isFirebaseConfigured) {
  const existing = getApps();
  app = existing.length ? existing[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { app, auth };
