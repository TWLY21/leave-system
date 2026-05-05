# Leave Management System
<img width="1277" height="673" alt="image" src="https://github.com/user-attachments/assets/a02ccb19-f263-432b-ab0f-f836efb7effd" />

A production-oriented fullstack leave management system built with Express, Vue 3, PostgreSQL, SQLite, Playwright, and GitHub Actions.

The project focuses on practical engineering skills instead of flashy UI alone: authentication, role-based access, leave workflow rules, database flexibility, automated tests, and CI.

## What This Project Does

This system allows employees to register, log in, submit leave requests, and manage their own requests from a dashboard. Admin users can review the full queue and approve or reject pending leave.

Current user-facing capabilities:

- User registration and login
- JWT-based protected API access
- Leave requests using `startDate` and `endDate`
- Duplicate and overlapping date prevention per user
- Dashboard metrics, filtering, sorting, and pagination
- Cancel and delete actions for a user's own leave requests
- Admin approval and rejection flow
- Toast notifications, loading states, empty states, and confirmation modal
- Playwright API and end-to-end test coverage
- CI pipeline with lint, build, audit, and Playwright test runs

## Tech Stack

### Backend

- Node.js
- Express
- express-validator
- express-rate-limit
- jsonwebtoken
- bcryptjs
- PostgreSQL via `pg`
- SQLite via `sqlite` and `sqlite3`

### Frontend

- Vue 3
- Vue Router
- Axios
- Vite

### Testing and CI

- Playwright API tests
- Playwright browser E2E tests
- GitHub Actions
- ESLint

## Architecture Overview

The app follows a standard frontend-to-backend-to-database request flow:

1. The Vue frontend collects input from the user.
2. Axios sends a request to the Express API.
3. Express routes apply validation and auth middleware.
4. Controllers call the service layer.
5. Services apply business rules such as overlap checks and ownership checks.
6. Models read or write the database.
7. The backend returns JSON.
8. The frontend updates the dashboard or form state.

## Database Modes

The backend supports two database modes.

### PostgreSQL

PostgreSQL is the recommended database for a more production-style setup.

Use it when you want:

- a more realistic portfolio deployment story
- a shared SQL server instead of a local file
- cleaner production hosting on services like Render

Required backend environment variables:

```env
DB_CLIENT=postgres
DATABASE_URL=postgresql://postgres:password@localhost:5432/leave_system
DB_SSL=false
```

### SQLite

SQLite remains supported as a local fallback.

Use it when you want:

- the easiest local setup
- fast local testing without running PostgreSQL
- disposable databases for Playwright test suites

Required backend environment variables:

```env
DB_CLIENT=sqlite
DB_PATH=data/leave-system.sqlite
```

### Important note about tests

The automated Playwright suites intentionally use SQLite test databases so the project can be tested locally and in CI without requiring a PostgreSQL server.

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
|   +-- data/
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

## Backend Overview

### Main backend responsibilities

The backend handles:

- authentication and JWT issuance
- request validation
- rate limiting on auth endpoints
- role-based access control
- leave workflow rules
- overlap and duplicate leave prevention
- database initialization and seeding

### Main API endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`

Leaves:

- `GET /api/leaves`
- `POST /api/leaves`
- `PUT /api/leaves/:id`
- `DELETE /api/leaves/:id`
- `PUT /api/leaves/:id/approve`
- `PUT /api/leaves/:id/reject`

### Where key backend logic lives

- Environment and DB driver selection: `backend/src/config/env.js`, `backend/src/config/database.js`
- Auth routes and validation: `backend/src/routes/authRoutes.js`
- Leave routes and validation: `backend/src/routes/leaveRoutes.js`
- Auth request handling: `backend/src/controllers/authController.js`
- Leave request handling: `backend/src/controllers/leaveController.js`
- Leave business rules: `backend/src/services/leaveService.js`
- User queries: `backend/src/models/userModel.js`
- Leave queries: `backend/src/models/leaveModel.js`
- JWT auth middleware: `backend/src/middleware/auth.js`

### Security measures currently implemented

- Password hashing with `bcryptjs`
- JWT authentication
- Auth middleware that reloads the latest user from the database instead of trusting stale token data
- Role-based authorization for admin actions
- Rate limiting on login and registration
- Strong password validation rules
- Production startup checks for unsafe fallback secrets

## Frontend Overview

### Main frontend responsibilities

The frontend provides the user interface for:

- logging in
- registering as a normal user
- viewing leave requests
- filtering and sorting dashboard results
- paginating larger request lists
- submitting leave ranges with a blocked-date calendar
- approving, rejecting, cancelling, and deleting where allowed

### Pages

- `LoginPage.vue`: signs in an existing user
- `RegisterPage.vue`: creates a normal user account and signs them in immediately
- `DashboardPage.vue`: shows metrics, leave records, status filters, sorting, pagination, and actions
- `ApplyLeavePage.vue`: submits a leave range and disables already-used dates

### UX improvements currently included

- reusable UI components such as cards, buttons, form inputs, badges, modal, pagination, and alerts
- toast notifications for success and error feedback
- loading skeletons and button loading states
- empty states when no requests exist or filters return no matches
- confirm dialog before deleting leave
- disabled and greyed-out dates already used by the current user

### State management

The frontend uses a lightweight shared reactive auth module instead of a larger state library.

- `frontend/src/services/auth.js` stores the token and user in shared reactive state
- session is persisted in `localStorage` for this demo project
- route guards block protected pages when no session exists

Security note:

`localStorage` is acceptable for this demo and portfolio project, but a production system should prefer `httpOnly` cookies plus CSRF protection.

## Leave Workflow Rules

The leave system includes business rules beyond simple CRUD.

### Current leave rules

- A user cannot submit a leave request that overlaps with one of their existing leave requests.
- Exact duplicates are rejected with a clear message.
- Leave ranges must have a valid order, where `endDate` is the same as or later than `startDate`.
- A user can cancel only their own pending request.
- A user can delete only their own request.
- Only admins can approve or reject pending requests.
- The frontend blocks already-used dates before submission, and the backend validates again as the source of truth.

## Local Development

### Install dependencies

From the project root:

```bash
npm install
```

### Configure the backend

```bash
copy backend\.env.example backend\.env
```

Choose one database mode.

#### Option A: SQLite

```env
DB_CLIENT=sqlite
DB_PATH=data/leave-system.sqlite
JWT_SECRET=replace-me
ADMIN_PASSWORD=Admin123!
```

#### Option B: PostgreSQL

```env
DB_CLIENT=postgres
DATABASE_URL=postgresql://postgres:password@localhost:5432/leave_system
DB_SSL=false
JWT_SECRET=replace-me
ADMIN_PASSWORD=Admin123!
```

### Configure the frontend

```bash
copy frontend\.env.example frontend\.env
```

For local development, make sure the frontend points to the local backend:

```env
VITE_API_URL=http://127.0.0.1:4000/api
```

### Run the backend

```bash
npm run dev:backend
```

Backend URL:

- `http://127.0.0.1:4000`

### Run the frontend

In a second terminal:

```bash
npm run dev:frontend
```

Frontend URL:

- `http://127.0.0.1:5173`

### Default admin account

- Username: `admin`
- Password: `Admin123!`

The backend seeds this account on startup. If the admin already exists, startup also keeps its role and password hash aligned with `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `backend/.env`.

## Useful Commands

```bash
npm run dev:backend
npm run dev:frontend
npm run build
npm run lint
npm run test:api
npm run test:e2e
npm test
npm run audit:prod
```

## Example User Flow

### Employee flow

1. Open the frontend.
2. Register a new account or log in.
3. Go to the Apply Leave page.
4. Pick a leave range.
5. Greyed-out dates are unavailable because they already belong to that user.
6. Submit the request.
7. Return to the dashboard to see the request in `pending` status.
8. Cancel or delete it later if allowed.

### Admin flow

1. Log in as the seeded admin user.
2. Open the dashboard.
3. Review all employee leave requests.
4. Filter by status or sort by date when needed.
5. Approve or reject pending requests.
6. The dashboard updates the status immediately after the API response returns.

## Testing

### API tests

API tests live in `backend/tests/api` and use Playwright's request client.

They cover:

- registration and login
- weak password rejection
- leave creation
- duplicate and overlap rejection
- invalid date ranges
- unauthorized and forbidden access
- admin approval flow
- owner-only delete behavior

Run them with:

```bash
npm run test:api
```

### End-to-end tests

Browser tests live in `e2e/playwright`.

They cover:

- user registration
- login flow
- leave submission through the UI
- admin approval flow
- deleting a leave request from the dashboard

Run them with:

```bash
npm run test:e2e
```

## CI/CD

The GitHub Actions workflow lives in `.github/workflows/ci.yml`.

It currently does the following on every `push` and `pull_request`:

1. Checks out the repository.
2. Sets up Node.js 22.
3. Installs dependencies with `npm ci`.
4. Runs ESLint.
5. Builds the frontend.
6. Installs Playwright browsers.
7. Runs API tests.
8. Runs E2E tests.
9. Runs a production-only dependency audit.
10. Uploads Playwright artifacts when available.

## Deployment Notes

### Backend deployment

The backend is ready for services such as Render.

Recommended production backend environment variables:

- `DB_CLIENT=postgres`
- `DATABASE_URL=<your-postgres-connection-string>`
- `DB_SSL=true`
- `JWT_SECRET=<strong-random-secret>`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=<strong-password>`

### Frontend deployment

The frontend is ready for services such as Vercel.

Set:

- `VITE_API_URL=https://your-backend-url/api`

Because the frontend uses client-side routing, the deployment should rewrite routes back to `index.html`.

## What This Project Demonstrates

This project is a strong portfolio example because it demonstrates:

- fullstack architecture
- REST API design
- JWT authentication and authorization
- password hashing and rate limiting
- SQL database support with PostgreSQL and SQLite
- business-rule validation beyond basic CRUD
- Vue 3 frontend state and routing
- reusable component design and improved dashboard UX
- Playwright API and E2E automation
- CI workflow setup and production-oriented configuration

## License

This project is licensed under the MIT License. See the LICENSE file for details.

