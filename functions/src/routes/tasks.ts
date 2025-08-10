import express from "express";
import { getFirestore } from "firebase-admin/firestore";
import type { AuthedRequest } from "../middleware/auth";
import { haversineDistanceKm } from "../lib/geo";

const router = express.Router();
const db = getFirestore();

router.post("/", async (req: AuthedRequest, res) => {
  const uid = req.user!.uid;
  const { type, description, location, preferredTime, budget, skillsRequired } = req.body || {};
  if (!type || !description || !location || typeof location.lat !== "number" || typeof location.lng !== "number") {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const now = Date.now();
  const doc = await db.collection("tasks").add({
    type,
    description,
    location,
    preferredTime: preferredTime ?? null,
    budget: budget ?? null,
    skillsRequired: Array.isArray(skillsRequired)
      ? skillsRequired.map((s: string) => s.toLowerCase().trim()).slice(0, 30)
      : [],
    status: "open",
    creatorUid: uid,
    assigneeUid: null,
    createdAt: now,
    updatedAt: now,
    proofs: [],
  });
  return res.json({ id: doc.id });
});

router.get("/", async (req: AuthedRequest, res) => {
  const uid = req.user!.uid;
  const { mine, recommend, lat, lng, radiusKm, limit } = req.query as any;
  const max = Math.min(Number(limit) || 30, 100);
  const tasksRef = db.collection("tasks");

  if (mine === "creator") {
    const snap = await tasksRef.where("creatorUid", "==", uid).orderBy("createdAt", "desc").limit(max).get();
    return res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  if (mine === "assignee") {
    const snap = await tasksRef.where("assigneeUid", "==", uid).orderBy("createdAt", "desc").limit(max).get();
    return res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  if (recommend === "true") {
    const profDoc = await db.collection("profiles").doc(uid).get();
    const prof = profDoc.data() || {};
    const skills: string[] = Array.isArray(prof.skills) ? prof.skills : [];
    let q: FirebaseFirestore.Query = tasksRef.where("status", "==", "open");
    if (skills.length) {
      q = q.where("skillsRequired", "array-contains-any", skills.slice(0, 10));
    }
    const snap = await q.orderBy("createdAt", "desc").limit(100).get();
    const lt = Number(lat);
    const ln = Number(lng);
    const r = Number(radiusKm) || 50;
    const resTasks = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((t) => (!isNaN(lt) && !isNaN(ln) ? haversineDistanceKm(lt, ln, t.location?.lat, t.location?.lng) <= r : true))
      .sort((a, b) => {
        const aScore = (a.skillsRequired?.filter((s: string) => skills.includes(s)).length || 0);
        const bScore = (b.skillsRequired?.filter((s: string) => skills.includes(s)).length || 0);
        return bScore - aScore;
      })
      .slice(0, max);
    return res.json(resTasks);
  }

  const snap = await tasksRef.orderBy("createdAt", "desc").limit(max).get();
  return res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const doc = await db.collection("tasks").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Not found" });
  return res.json({ id: doc.id, ...doc.data() });
});

router.post("/:id/accept", async (req: AuthedRequest, res) => {
  const uid = req.user!.uid;
  const ref = db.collection("tasks").doc(req.params.id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Not found");
    const data = snap.data() as any;
    if (data.status !== "open") throw new Error("Task not open");
    tx.update(ref, { status: "assigned", assigneeUid: uid, updatedAt: Date.now() });
  });
  return res.json({ ok: true });
});

router.post("/:id/complete", async (req: AuthedRequest, res) => {
  const uid = req.user!.uid;
  const { proofs, comment } = req.body || {};
  const ref = db.collection("tasks").doc(req.params.id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Not found");
    const data = snap.data() as any;
    if (data.status !== "assigned" || data.assigneeUid !== uid) throw new Error("Not allowed");
    tx.update(ref, {
      status: "completed",
      updatedAt: Date.now(),
      proofs: Array.isArray(proofs) ? proofs.slice(0, 10) : [],
      completionComment: comment || null,
    });
  });
  return res.json({ ok: true });
});

export default router;
