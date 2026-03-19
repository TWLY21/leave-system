/*
 * Final error-handling middleware for the backend API.
 * This file standardizes 404 responses and converts thrown errors into JSON
 * payloads that the frontend and tests can rely on.
 */

// Custom application error used to attach status codes and optional details.
const HttpError = require('../utils/httpError');

// Converts unmatched routes into a structured 404 error.
function notFound(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Converts any thrown or forwarded error into a JSON HTTP response.
function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    message: err.message || 'Internal server error.'
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json(payload);
}

// Exports both final middleware functions for app.js.
module.exports = {
  errorHandler,
  notFound
};
