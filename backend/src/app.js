/*
 * Backend application composition for the Leave Management System.
 * This file creates the Express app, registers shared middleware, exposes the
 * health-check endpoint, and mounts the auth and leave API route groups.
 * JWT-protected business endpoints are attached here through the route modules.
 */

// Loads the Express framework used to build the REST API.
const express = require('express');
// Enables cross-origin requests so the Vue frontend can call the API.
const cors = require('cors');
// Provides resolved environment configuration such as the allowed frontend origin.
const env = require('./config/env');
// Mounts authentication endpoints like POST /api/auth/register and POST /api/auth/login.
const authRoutes = require('./routes/authRoutes');
// Mounts leave management endpoints like POST /api/leaves and PUT /api/leaves/:id/approve.
const leaveRoutes = require('./routes/leaveRoutes');
// Provides the final 404 handler and centralized error response handler.
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Creates the Express application instance shared by the server entry point and tests.
const app = express();

// Allows the configured frontend origin to call this API in the browser.
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }));
// Parses incoming JSON request bodies before route handlers access req.body.
app.use(express.json());

// Lightweight infrastructure endpoint used by Playwright and deployment platforms.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Registers authentication routes under /api/auth.
app.use('/api/auth', authRoutes);
// Registers leave CRUD and review routes under /api/leaves.
app.use('/api/leaves', leaveRoutes);

// Converts unmatched URLs into a consistent 404 JSON response.
app.use(notFound);
// Converts thrown errors and middleware failures into API responses.
app.use(errorHandler);

// Exports the configured app so the startup file can listen on a port.
module.exports = app;
