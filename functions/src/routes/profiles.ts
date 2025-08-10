import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import type { AuthedRequest } from "../middleware/auth";

const router = express.Router();
const db = getFirestore();

router.get("/me", async (req: AuthedRequest, res) => {
  const uid = req.user!.uid;
  const doc = await db.collection("profiles").doc(uid).get();
  if (!doc.exists) return res.status(404).json({ error: "Profile not found" });
  return res.json({ id: doc.id, ...doc.data() });
});

router.post("/", async (req: AuthedRequest, res) => {
  const uid = req.user!.uid;
  const { name, roles, location, skills, availability, phone, photoURL } = req.body || {};
  if (!name || !roles || !Array.isArray(roles)) return res.status(400).json({ error: "Invalid payload" });
  const now = Date.now();
  const payload = {
    uid,
    name,
    roles,
    location: location ?? null,
    skills: Array.isArray(skills) ? skills.map((s: string) => s.toLowerCase().trim()).slice(0, 50) : [],
    availability: availability ?? null,
    phone: phone ?? null,
    photoURL: photoURL ?? null,
    rating: null,
    updatedAt: now,
    createdAt: now,
  };
  await db.collection("profiles").doc(uid).set(payload, { merge: true });
  const saved = await db.collection("profiles").doc(uid).get();
  return res.json({ id: uid, ...saved.data() });
});

export default router;
