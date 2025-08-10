import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth";
import profilesRouter from "./routes/profiles";
import tasksRouter from "./routes/tasks";
import matchesRouter from "./routes/matches";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/v1/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// Protected routes
app.use("/api/v1", authMiddleware);
app.use("/api/v1/profiles", profilesRouter);
app.use("/api/v1/tasks", tasksRouter);
app.use("/api/v1/matches", matchesRouter);

export default app;
