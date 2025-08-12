const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const profilesRouter = require('./routes/profiles');
const tasksRouter = require('./routes/tasks');
const matchesRouter = require('./routes/matches');
const { authMiddleware } = require('./middleware/auth');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Health
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Public auth routes
app.use('/api/v1/auth', authRouter);

// Protected routes
app.use('/api/v1', authMiddleware);
app.use('/api/v1/profiles', profilesRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/matches', matchesRouter);

module.exports = app;
