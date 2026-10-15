# PizzaHouse — local development

## Requirements
- Node.js 20+ (Node.js 22 recommended)
- MongoDB Atlas or local MongoDB
- Razorpay test-mode credentials for payment testing
- Gmail App Password for email verification (optional until testing email flows)

## Install and run
Open two terminals.

Terminal 1:
```bash
cd server
npm install
# Copy .env.example to .env and fill in your own values.
npm run dev
```

Terminal 2:
```bash
cd client
npm install
npm run dev
```

Open the exact Vite URL printed in Terminal 2 (usually http://localhost:5173).
The backend health check is http://localhost:5000/.

## Environment
Copy `server/.env.example` to `server/.env` and replace placeholders. Do not commit or share `.env`.
Copy `client/.env.example` to `client/.env` if you need to change the API URL.
Never put Razorpay secrets, MongoDB credentials, email app passwords, or JWT secrets in the client folder.

## Roles
New registrations are ordinary users by default. To create an admin for a local demo:
1. Register and verify a second account.
2. In MongoDB Atlas, change only that account's `role` field to `admin`.
3. Keep admin API middleware enabled. Never accept `role` from the public registration form.

## Notes
- The admin order-status route has been corrected to `/api/admin/orders/:id/status`.
- The welcome page no longer automatically redirects to an old saved session on initial load.
- If sign-up reports a server connection error, ensure the backend terminal says it connected to MongoDB and is listening on port 5000.
- The verification link defaults to `http://localhost:5000`; this is for local testing on the same computer. Set `BACKEND_URL` to the reachable backend URL if testing from another device.
