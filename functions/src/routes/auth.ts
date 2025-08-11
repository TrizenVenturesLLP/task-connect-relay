import express from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const router = express.Router();
const auth = getAuth();
const db = getFirestore();

// POST /api/v1/auth/signup
// Body: { email, password, displayName?, phoneNumber? }
router.post("/signup", async (req, res) => {
  try {
    const { email, password, displayName, phoneNumber } = req.body || {};
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Invalid payload: email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const userRecord = await auth.createUser({ email, password, displayName, phoneNumber });

    // Create a minimal profile document
    const now = Date.now();
    await db.collection("profiles").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        name: displayName ?? email.split("@")[0],
        roles: ["both"],
        location: null,
        skills: [],
        availability: null,
        phone: phoneNumber ?? null,
        photoURL: userRecord.photoURL ?? null,
        rating: null,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    // Generate email verification link for convenience
    let emailVerificationLink: string | null = null;
    try {
      emailVerificationLink = await auth.generateEmailVerificationLink(email);
    } catch {
      emailVerificationLink = null;
    }

    return res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      emailVerificationLink,
    });
  } catch (error: any) {
    const code = error?.code || "unknown";
    const message = error?.message || "Signup failed";
    return res.status(400).json({ error: message, code });
  }
});

// POST /api/v1/auth/password/reset
// Body: { email, continueUrl? }
router.post("/password/reset", async (req, res) => {
  try {
    const { email, continueUrl } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Invalid payload: email is required" });
    }
    const actionCodeSettings = continueUrl ? { url: continueUrl } : undefined;
    const resetLink = await auth.generatePasswordResetLink(email, actionCodeSettings as any);
    return res.json({ email, resetLink });
  } catch (error: any) {
    const code = error?.code || "unknown";
    const message = error?.message || "Could not generate reset link";
    return res.status(400).json({ error: message, code });
  }
});

export default router;
