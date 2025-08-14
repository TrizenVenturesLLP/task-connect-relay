# Standalone Express Backend (Firebase + Firestore)

This folder contains a Node.js Express server that mirrors the existing Firebase Functions API.

Endpoints (same as before):
- GET    /api/v1/health

- POST   /api/v1/auth/signup
  request
  {
  "email": "user@example.com",
  "password": "secret123",
  "displayName": "Alex Doe",
  "phoneNumber": "+15551234567"
  }

- POST   /api/v1/auth/password/reset

- GET    /api/v1/profiles/me
response 
{
    "id": "fulIGWvUSCObTb534YTpY6ttaei1",
    "_id": "689b3dbebe78618b1c306efd",
    "uid": "fulIGWvUSCObTb534YTpY6ttaei1",
    "availability": null,
    "createdAt": 1755004351333,
    "location": null,
    "name": "Alex Doe",
    "phone": "+918277730412",
    "photoURL": null,
    "rating": null,
    "roles": [
        "both"
    ],
    "skills": [],
    "updatedAt": 1755004351333
}

- POST   /api/v1/profiles
- POST   /api/v1/tasks
- GET    /api/v1/tasks
- GET    /api/v1/tasks/:id
- POST   /api/v1/tasks/:id/accept
- POST   /api/v1/tasks/:id/complete
- GET    /api/v1/matches/tasks/:taskId/candidates

Auth: Protected routes require Authorization: Bearer <Firebase ID token>.

## Setup
You can supply Firebase credentials in any of the following ways (priority order):

1) Environment variables (recommended for CI/servers):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (escape newlines as `\\n`)

2) Service account file:
   - Place `serviceAccountKey.json` in this `backend/` folder, or
   - Set `FIREBASE_SERVICE_ACCOUNT_PATH` to its location

3) Application Default Credentials (ADC):
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON path
   - Or run where ADC is available (GCP/Cloud Run)

Optionally set `PORT` to change the port (default 4000).

## Install & Run
```bash
cd backend
npm i

# .env
# Firebase (auth only) + MongoDB
# MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority&appName=<app>
# MONGODB_DB=extrahand

npm run dev   # watches with nodemon
# or
npm start     # production
```

### .env example
Create `backend/.env` (do not commit secrets) or use environment variables:
```
PORT=4000
FIREBASE_PROJECT_ID=extrahand-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz@extrahand-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEv...\\n-----END PRIVATE KEY-----\\n"
```

## Notes
- CORS is enabled by default for all origins during development.
- Phone OTP flow remains client-side with Firebase Web SDK (Option B).
- Firestore data model matches the previous Functions implementation.

## Using ADPT4EH Firebase web credentials here
The ADPT4EH app uses web SDK config (apiKey, authDomain, etc.). Those are not used by the Admin SDK. For this backend, keep Firebase only for authentication (verifying ID tokens). Data is stored in MongoDB.
