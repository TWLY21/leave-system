/*
 * Simple custom error class for API responses.
 * This utility lets controllers and middleware throw errors with an HTTP status
 * code and optional structured details instead of manually building responses.
 */

// Extends the built-in Error object with HTTP-specific metadata.
class HttpError extends Error {
  // Creates an error that the centralized error handler can serialize to JSON.
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Exports the error class for use across controllers and middleware.
module.exports = HttpError;
