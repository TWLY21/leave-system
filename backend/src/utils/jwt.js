/*
 * JWT helper utilities for authentication flows.
 * This file is where JWT tokens are created after successful registration or
 * login. The returned token is stored by the frontend and later verified by
 * the auth middleware on protected routes.
 */

// Creates signed JWT tokens for authenticated users.
const jwt = require('jsonwebtoken');
// Supplies the configured secret used to sign tokens.
const env = require('../config/env');

// Signs a token containing the user identity and role used by protected routes.
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: '1d' }
  );
}

// Exports the token signer for auth controller responses.
module.exports = {
  signToken
};
