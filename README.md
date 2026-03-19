# Leave Management System

A production-oriented fullstack leave management system built with Express, Vue 3, PostgreSQL, SQLite, Playwright, and GitHub Actions.

This project now supports two database modes:

- PostgreSQL: the recommended production-style database for deployment.
- SQLite: a local fallback that keeps development and automated tests easy to run.

## System Overview

The project is split into four main layers:

- Backend: Express REST API in `backend/src`
- Frontend: Vue 3 SPA in `frontend/src`
- Database: PostgreSQL or SQLite, selected through backend environment variables
- Testing: Playwright API tests and browser E2E tests

The main request flow is:

1. A user logs in on the Vue frontend.
2. The frontend calls the Express backend with Axios.
3. The backend validates input, verifies JWT auth when required, and calls the service and model layers.
4. The model layer reads or writes database data.
5. The backend returns JSON.
6. The frontend updates the page state from that JSON.
7. Playwright tests verify the same behavior automatically.

## Project Structure

```text
leave-system/
+-- backend/
|   +-- src/
|   |   +-- app.js
|   |   +-- server.js
|   |   +-- config/
|   |   +-- controllers/
|   |   +-- middleware/
|   |   +-- models/
|   |   +-- routes/
|   |   +-- services/
|   |   +-- utils/
|   +-- tests/api/
|   +-- .env.example
+-- frontend/
|   +-- src/
|   |   +-- App.vue
|   |   +-- main.js
|   |   +-- components/
|   |   +-- pages/
|   |   +-- router/
|   |   +-- services/
|   |   +-- utils/
|   |   +-- style.css
|   +-- .env.example
+-- e2e/playwright/
+-- .github/workflows/ci.yml
+-- playwright.api.config.js
+-- playwright.e2e.config.js
+-- render.yaml
+-- README.md
```

## Backend Explanation

### What the backend does

The backend exposes REST endpoints for authentication and leave management.

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`

Leave endpoints:

- `GET /api/leaves`
- `POST /api/leaves`
- `PUT /api/leaves/:id`
- `DELETE /api/leaves/:id`
- `PUT /api/leaves/:id/approve`
- `PUT /api/leaves/:id/reject`

### Where important backend behavior happens

JWT authentication:

- Token creation happens in `backend/src/utils/jwt.js`
- Login and register responses return JWTs in `backend/src/controllers/authController.js`
- Token verification happens in `backend/src/middleware/auth.js`

CRUD operations:

- Create leave: `backend/src/services/leaveService.js` -> `createLeaveRequest()`
- Read leave list: `backend/src/services/leaveService.js` -> `listLeavesForUser()`
- Update leave status: `backend/src/services/leaveService.js` -> `cancelLeaveRequest()` and `reviewLeaveRequest()`
- Delete leave: `backend/src/services/leaveService.js` -> `deleteLeaveRequest()`

Database calls:

- DB initialization and driver selection: `backend/src/config/database.js`
- User table reads and writes: `backend/src/models/userModel.js`
- Leave table reads and writes: `backend/src/models/leaveModel.js`

### Backend request flow

For a protected endpoint such as `PUT /api/leaves/:id/approve`:

1. `backend/src/app.js` mounts the leave routes.
2. `backend/src/routes/leaveRoutes.js` matches the URL.
3. `authenticate` middleware verifies the JWT and reloads the latest user from the database.
4. `authorize('admin')` ensures the caller is an admin.
5. Validation middleware checks the route parameter.
6. `approveLeave()` in the controller calls the leave service.
7. `reviewLeaveRequest()` applies business rules.
8. `updateLeaveStatus()` in the model updates PostgreSQL or SQLite.
9. JSON response is returned to the frontend.

## Frontend Explanation

### What the frontend does

The frontend is a Vue SPA with four main pages:

- Login Page: signs a user in and stores the JWT
- Register Page: creates a normal user account
- Dashboard Page: lists leave requests and shows available actions
- Apply Leave Page: sends a new leave request to the backend

### How frontend API calls work

All frontend API calls go through `frontend/src/services/api.js`.

- Axios is configured with `VITE_API_URL`
- A request interceptor adds `Authorization: Bearer <token>` when logged in
- A response interceptor clears the session on `401 Unauthorized`

Examples:

- Login page calls `POST /api/auth/login`
- Register page calls `POST /api/auth/register`
- Dashboard page calls `GET /api/leaves`, `PUT /api/leaves/:id`, `DELETE /api/leaves/:id`, and admin review endpoints
- Apply Leave page calls `POST /api/leaves`

### How frontend state management works

This project uses a simple shared reactive state instead of Vuex or Pinia.

State lives in `frontend/src/services/auth.js`:

- `authState.token`: current JWT
- `authState.user`: current logged-in user
- `setSession()`: saves token and user to reactive state and localStorage
- `clearSession()`: clears state and localStorage
- `isAuthenticated()`: used by router guards

## Database Explanation

The backend supports both PostgreSQL and SQLite.

### PostgreSQL mode

Use PostgreSQL when you want a more realistic production setup.

Required backend environment variables:

```env
DB_CLIENT=postgres
DATABASE_URL=postgresql://username:password@host:5432/database_name
DB_SSL=true
```

What happens in PostgreSQL mode:

- The backend opens a PostgreSQL connection pool with `pg`
- It creates the `users` and `leaves` tables if they do not exist
- It creates indexes for common leave queries
- It seeds the default admin account if missing

### SQLite mode

Use SQLite when you want the easiest local setup.

Required backend environment variables:

```env
DB_CLIENT=sqlite
DB_PATH=data/leave-system.sqlite
```

What happens in SQLite mode:

- The backend creates a local `.sqlite` file automatically
- It creates the same `users` and `leaves` tables
- It seeds the default admin account if missing

### Leave table design

The leave system stores both legacy single-day data and the current range-based fields:

- `date`: original single-day compatibility field
- `startDate` / `endDate`: current leave range fields
- `status`: `pending`, `approved`, `rejected`, or `cancelled`
- `reviewerId`, `reviewedAt`, `cancelledAt`: workflow metadata

Overlap protection is handled in the service layer before a leave is created.

## Local Development

### Install dependencies

From the project root:

```bash
npm install
```

### Configure the backend

Copy the backend env example:

```bash
copy backend\.env.example backend\.env
```

Then choose one of these modes.

#### Option A: Run with SQLite

```env
DB_CLIENT=sqlite
DB_PATH=data/leave-system.sqlite
```

#### Option B: Run with PostgreSQL

```env
DB_CLIENT=postgres
DATABASE_URL=postgresql://postgres:password@localhost:5432/leave_system
DB_SSL=false
```

### Configure the frontend

```bash
copy frontend\.env.example frontend\.env
```

### Run the backend

```bash
npm run dev:backend
```

Backend default URL:

- `http://127.0.0.1:4000`

### Run the frontend

In a second terminal:

```bash
npm run dev:frontend
```

Frontend default URL:

- `http://127.0.0.1:5173`

### Default admin account

- Username: `admin`
- Password: `Admin123!`

## Testing

### API tests

API tests live in `backend/tests/api` and use Playwright's request client.

Run them with:

```bash
npm run test:api
```

These tests intentionally use disposable SQLite databases so the suite can run without requiring a PostgreSQL server.

### End-to-end tests

Browser tests live in `e2e/playwright`.

Run them with:

```bash
npm run test:e2e
```

These tests also use disposable SQLite databases so they stay easy to run in CI.

## Example End-to-End Workflow

1. User opens the frontend login page.
2. User logs in.
3. Backend returns a JWT.
4. Frontend stores the JWT in localStorage and shared auth state.
5. User opens the Apply Leave page.
6. User submits a leave date range and reason.
7. Frontend sends `POST /api/leaves` with the JWT.
8. Backend checks overlap rules in the leave service.
9. The selected database stores the new `pending` leave request.
10. User returns to the dashboard and sees the new request.
11. Admin logs in.
12. Admin dashboard shows all leave requests.
13. Admin clicks Approve.
14. Frontend sends `PUT /api/leaves/:id/approve` with the admin JWT.
15. Backend updates the leave status to `approved`.
16. Dashboard refreshes and shows the approved status.

## CI/CD Explanation

GitHub Actions pipeline lives in `.github/workflows/ci.yml`.

It runs on:

- every `push`
- every `pull_request`

Pipeline steps:

1. Check out the repository.
2. Install Node.js.
3. Install dependencies.
4. Lint the codebase.
5. Build the Vue frontend.
6. Install Playwright browsers.
7. Run API tests.
8. Run E2E tests.
9. Upload Playwright artifacts when needed.

## Deployment Notes

### Backend deployment

The backend is set up for platforms such as Render.

Recommended backend environment variables:

- `DB_CLIENT=postgres`
- `DATABASE_URL=<your-postgres-connection-string>`
- `DB_SSL=true`
- `JWT_SECRET=<strong-random-secret>`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=<strong-password>`

### Frontend deployment

The frontend is intended for platforms such as Vercel.

Configure:

- `VITE_API_URL=https://your-backend-url/api`

The frontend uses client-side routing, so the deployment must rewrite routes back to `index.html`.
