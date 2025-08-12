# Standalone Express Backend (Firebase + Firestore)

This folder contains a Node.js Express server that mirrors the existing Firebase Functions API.

Endpoints (same as before):
- GET    /api/v1/health
- POST   /api/v1/auth/signup
- POST   /api/v1/auth/password/reset
- GET    /api/v1/profiles/me
- POST   /api/v1/profiles
- POST   /api/v1/tasks
- GET    /api/v1/tasks
- GET    /api/v1/tasks/:id
- POST   /api/v1/tasks/:id/accept
- POST   /api/v1/tasks/:id/complete
- GET    /api/v1/matches/tasks/:taskId/candidates

Auth: Protected routes require Authorization: Bearer <Firebase ID token>.

## Setup
1) Create a Firebase service account and download JSON credentials.
2) Set environment variable so Admin SDK can authenticate:
   - macOS/Linux: `export GOOGLE_APPLICATION_CREDENTIALS=~/path/to/serviceAccount.json`
   - Windows (PowerShell): `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\serviceAccount.json"`

Optionally set `PORT` to change the port (default 4000).

## Install & Run
```bash
cd backend
npm i
npm run dev   # watches with nodemon
# or
npm start     # production
```

## Notes
- CORS is enabled by default for all origins during development.
- Phone OTP flow remains client-side with Firebase Web SDK (Option B).
- Firestore data model matches the previous Functions implementation.
