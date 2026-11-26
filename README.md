# KhoonConnect — Karachi Blood Donation Management Website

A responsive full-stack starter project with React, Vite, Express and MongoDB.

## Features included
- Responsive premium red/white healthcare UI
- Home, donor finder, emergency request, blood banks, camps, learning, thalassemia, about, contact and auth pages
- Role-aware registration: donor, patient and blood bank
- Secure password hashing and JWT authentication
- Donor profile availability updates
- Donor search by blood group and Karachi area
- Emergency request creation and patient request history
- Admin request status workflow and user verification
- Blood bank directory and inventory API
- Donation camp directory and registration-interest endpoint
- Stats API and admin dashboard

## Requirements
- Node.js 18+
- MongoDB Atlas free cluster or a local MongoDB instance

## Run locally
1. Extract the ZIP.
2. Open the project folder in a terminal.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Add your MongoDB connection string to `MONGODB_URI`.
6. Set a long random `JWT_SECRET`.
7. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`.
8. Run `npm run dev`.
9. Open the Vite address shown in the terminal (usually `http://localhost:5173`).

The API runs on port 3000. Vite proxies API requests only if you configure a proxy; for local development, add the following `server.proxy` in `vite.config.js`:
```js
server: {
  host: '0.0.0.0',
  port: 5173,
  proxy: { '/api': 'http://localhost:3000' }
}
```
(Replace the current `server` property with the configuration above.)

## Production deployment
Build with `npm run build`, set the environment variables on your hosting provider, and run `npm start`. The Express server serves the built React app from `dist`.

## Important setup and safety notes
- Do not commit `.env` or expose database credentials.
- The first admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` at server startup if it does not already exist.
- Public donor search returns only name, blood group, area, availability and verification state; it does not return donor phone or email.
- Blood bank inventory is self-reported by participating organizations and must be confirmed directly before use.
- The app does not make medical eligibility or transfusion compatibility decisions. Qualified healthcare professionals and licensed blood banks must confirm those.
- The camp registration endpoint currently records interest only as a demo response; it does not yet maintain attendee records or send notifications.
- Emergency notifications (SMS, email, push) require an external provider and credentials; they are not represented as active in this starter.
- Add rate limiting, audit logs, email verification, password reset, CSRF protection where applicable, backups, monitoring, and a privacy/legal review before any real public launch.
