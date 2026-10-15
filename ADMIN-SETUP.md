# PizzaHouse Admin Panel Setup

## What changed
- Added a dedicated `/admin-login` page that refuses accounts unless the backend login response has `role: "admin"`.
- Expanded `/admin` with Order Tracking, Manage Pizzas, and Customers tabs.
- Added admin-only API routes for listing/creating/updating/deleting pizzas and listing customer records.
- Admin APIs continue to require the existing JWT auth middleware and database role verification middleware.
- Customer order tracking continues polling its own order endpoint every 5 seconds, so status changes saved by an admin show on the tracking page.
- ZIP intentionally excludes `node_modules` and real `.env` secrets. Use `server/.env.example` to configure your local environment.

## Install and run (Windows PowerShell)
Terminal 1:
```powershell
cd path\to\pizza-delivery-app\server
npm install
npm run dev
```
Terminal 2:
```powershell
cd path\to\pizza-delivery-app\client
npm install
npm run dev
```
Configure `server/.env` using `.env.example` and your own credentials before starting the backend. Do not commit or share `.env`.

## Create a separate admin account
1. Register a new account on the site using an email you control.
2. Verify the email using the existing verification flow.
3. In MongoDB Atlas, open the database's `users` collection and find that account by email.
4. Change only that document's `role` to `admin`. Keep `isVerified` set to `true`.
5. Visit `http://localhost:5173/admin-login` and sign in with that account.
6. If already signed in as a customer, log out first or clear `pizzaToken` and `pizzaUser` in the browser's local storage.

Registration deliberately does not accept a role from the browser. Do not add a public admin-registration option.

## Test order tracking
1. Use a test order whose `paymentStatus` is `paid`.
2. Sign in at `/admin-login`, open Orders & Tracking, and select a status such as Preparing Your Pizza or Out for Delivery.
3. Open the customer account that owns the order and visit its tracking page.
4. The customer tracker should reflect the saved status after its next refresh (within about 5 seconds).

The backend prevents fulfillment statuses for unpaid orders. This is a local development project; test payment flows with Razorpay test credentials and never share real secrets.
