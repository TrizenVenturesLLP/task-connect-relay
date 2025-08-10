import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import app from "./app";

initializeApp();
const db = getFirestore();

export const api = onRequest({ cors: true, region: "us-central1" }, app);

export const onTaskCreated = onDocumentCreated("tasks/{taskId}", async (event) => {
  const task = event.data?.data() as any;
  if (!task) return;
  try {
    const skills: string[] = Array.isArray(task.skillsRequired) ? task.skillsRequired : [];
    let q: FirebaseFirestore.Query = db.collection("profiles").where("roles", "array-contains", "tasker");
    if (skills.length) q = q.where("skills", "array-contains-any", skills.slice(0, 10));
    const snap = await q.limit(200).get();
    const candidates = snap.docs.map((d) => d.data() as any);
    const batch = db.batch();
    const now = Date.now();
    candidates.slice(0, 100).forEach((c) => {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        toUid: c.uid,
        type: "task_recommendation",
        taskId: event.params.taskId,
        createdAt: now,
        read: false,
      });
    });
    await batch.commit();
  } catch (e) {
    logger.error("match notify error", e as any);
  }
});

export const onTaskUpdated = onDocumentUpdated("tasks/{taskId}", async (event) => {
  const before = event.data?.before.data() as any;
  const after = event.data?.after.data() as any;
  if (!before || !after) return;
  try {
    const notifCol = db.collection("notifications");
    const now = Date.now();
    if (before.status !== after.status && after.status === "assigned") {
      await Promise.all([
        notifCol.add({ toUid: after.creatorUid, type: "task_assigned", taskId: event.params.taskId, createdAt: now, read: false }),
        notifCol.add({ toUid: after.assigneeUid, type: "task_assign_you", taskId: event.params.taskId, createdAt: now, read: false }),
      ]);
    }
    if (before.status !== after.status && after.status === "completed") {
      await notifCol.add({ toUid: after.creatorUid, type: "task_completed", taskId: event.params.taskId, createdAt: now, read: false });
    }
  } catch (e) {
    logger.error("status notify error", e as any);
  }
});
