/*
 * Authentication and authorization middleware for protected API routes.
 * This file is where JWT verification happens. The authenticate() middleware
 * checks the Bearer token, reloads the current user from the database, and
 * stores fresh user data on req.user. The authorize() middleware then restricts
 * selected routes to specific roles.
 */

// Decodes and verifies signed JWT tokens from the Authorization header.
const jwt = require('jsonwebtoken');
// Supplies the JWT secret used during verification.
const env = require('../config/env');
// Reads the latest user record so stale tokens can be rejected.
const { findUserById } = require('../models/userModel');
// Produces consistent API errors for missing or invalid auth.
const HttpError = require('../utils/httpError');

// Verifies the Bearer token, reloads the user from the database, and attaches fresh user data.
async function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authentication token is required.'));
  }

  const token = header.replace('Bearer ', '').trim();

  try {
    // JWT auth starts here: the token is decoded and validated with the shared secret.
    const decoded = jwt.verify(token, env.jwtSecret);
    const currentUser = await findUserById(decoded.id);

    if (!currentUser) {
      return next(new HttpError(401, 'Authentication token is no longer valid.'));
    }

    // Role and username changes invalidate old tokens so permissions cannot linger after account updates.
    if (currentUser.role !== decoded.role || currentUser.username !== decoded.username) {
      return next(new HttpError(401, 'Authentication token is outdated. Please sign in again.'));
    }

    req.user = currentUser;
    return next();
  } catch {
    return next(new HttpError(401, 'Authentication token is invalid.'));
  }
}

// Returns middleware that enforces allowed roles such as "admin".
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to perform this action.'));
    }

    return next();
  };
}

// Exports middleware functions used by the leave routes.
module.exports = {
  authenticate,
  authorize
};
