/*
 * Authentication controller for register and login endpoints.
 * This file contains the business logic behind POST /api/auth/register and
 * POST /api/auth/login. It hashes passwords, validates login credentials,
 * creates users through the model layer, and returns JWT auth payloads.
 */

// Hashes passwords for registration and compares passwords during login.
const bcrypt = require('bcryptjs');
// Performs the user-related database calls used by authentication flows.
const { createUser, findUserByUsername } = require('../models/userModel');
// Signs JWT tokens that the frontend stores and sends on later API requests.
const { signToken } = require('../utils/jwt');
// Standard application error class used for API-friendly failures.
const HttpError = require('../utils/httpError');

// Formats a consistent authentication response containing the JWT and public user data.
function buildAuthResponse(user) {
  return {
    token: signToken(user),
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  };
}

// Handles POST /api/auth/register by creating a new employee account.
async function register(req, res) {
  const { username, password } = req.body;
  // Reads from the users table to prevent duplicate usernames.
  const existingUser = await findUserByUsername(username);

  if (existingUser) {
    throw new HttpError(409, 'Username is already in use.');
  }

  // Hashes the raw password before any database write occurs.
  const passwordHash = bcrypt.hashSync(password, 10);
  // Creates the new user record through the model layer regardless of the active SQL driver.
  const user = await createUser({ username, passwordHash, role: 'user' });

  // Returns the token the frontend will store in localStorage.
  res.status(201).json(buildAuthResponse(user));
}

// Handles POST /api/auth/login by validating credentials and issuing a JWT.
async function login(req, res) {
  const { username, password } = req.body;
  // Reads the user record and stored password hash from the active database.
  const user = await findUserByUsername(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw new HttpError(401, 'Invalid username or password.');
  }

  // Returns a fresh JWT so the frontend can authenticate later requests.
  res.json(buildAuthResponse(user));
}

// Exports handlers so the auth route file can attach them to endpoints.
module.exports = {
  login,
  register
};
