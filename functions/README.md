# Extrahand Firebase Functions

Deployable Node.js (TypeScript) backend using Firebase Functions, Firestore, and Storage.

APIs (all require Authorization: Bearer <Firebase ID token>):
- GET    /api/v1/health
- GET    /api/v1/profiles/me
- POST   /api/v1/profiles         { name, roles:[poster|tasker|both], location:{lat,lng,address?}, skills:[string], availability, phone, photoURL }
- POST   /api/v1/tasks            { type, description, location:{lat,lng,address?}, preferredTime?, budget?, skillsRequired:[string] }
- GET    /api/v1/tasks            query: mine=creator|assignee | recommend=true&lat&lng&radiusKm&limit
- GET    /api/v1/tasks/:id
- POST   /api/v1/tasks/:id/accept
- POST   /api/v1/tasks/:id/complete { proofs:[url], comment }
- GET    /api/v1/matches/tasks/:taskId/candidates  query: lat&lng&radiusKm

Triggers:
- tasks onCreate: writes recommendation notifications to /notifications
- tasks onUpdate (status): notifies creator/assignee when assigned/completed

Rules:
- Firestore: client writes disabled; reads allowed for authed users (tasks) and owner-only (profiles, notifications)
- Storage: allow uploads to /proofs/{uid}/... and /profilePhotos/{uid}/...

Local Dev:
1) Install Firebase CLI and login
2) cd functions && npm i
3) npm run serve  (emulators for functions/firestore/auth/storage)

Deploy:
1) Ensure you ran: firebase init (select this folder) and set project
2) cd functions && npm run deploy

Notes:
- Matching uses skills + distance (Haversine) computed server-side after a filtered query.
- Add FCM later by storing device tokens in profiles and sending in triggers.
