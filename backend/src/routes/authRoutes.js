/*
 * Authentication route definitions for the backend API.
 * This file maps auth endpoints to rate limiting, validation middleware, and
 * controller logic. Endpoints:
 * - POST /api/auth/register: create a new user account and return a JWT
 * - POST /api/auth/login: verify credentials and return a JWT
 */

// Creates an isolated Express router for auth-specific endpoints.
const { Router } = require('express');
// Builds request validators for auth request bodies.
const { body } = require('express-validator');
// Supplies the business logic for registration and login.
const { login, register } = require('../controllers/authController');
// Adds basic brute-force protection to login and registration endpoints.
const { authRateLimiter } = require('../middleware/rateLimit');
// Converts validation failures into a 422 JSON API response.
const validate = require('../middleware/validate');

// Router instance mounted by app.js at /api/auth.
const router = Router();

// Shared password rules used by the register endpoint.
const passwordRules = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long.')
  .matches(/[a-z]/)
  .withMessage('Password must include at least one lowercase letter.')
  .matches(/[A-Z]/)
  .withMessage('Password must include at least one uppercase letter.')
  .matches(/\d/)
  .withMessage('Password must include at least one number.')
  .matches(/[^A-Za-z0-9]/)
  .withMessage('Password must include at least one symbol.');

// POST /api/auth/register validates username and password, then creates a user and returns a JWT.
router.post(
  '/register',
  authRateLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters.'),
    passwordRules
  ],
  validate,
  register
);

// POST /api/auth/login validates required fields, then authenticates and returns a JWT.
router.post(
  '/login',
  authRateLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  validate,
  login
);

// Exports the router so app.js can mount the auth API group.
module.exports = router;
