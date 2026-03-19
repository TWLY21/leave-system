/*
 * Authentication rate-limit middleware.
 * This file defines a small, focused limiter for login and registration so the
 * portfolio project demonstrates basic brute-force protection without adding a
 * lot of extra infrastructure.
 */

// Creates Express-compatible rate limiting middleware.
const rateLimit = require('express-rate-limit');
// Reads environment mode so tests can stay deterministic.
const env = require('../config/env');

// Applies the same protection to login and register to slow repeated auth abuse.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Automated tests make many auth requests quickly; skipping the limiter there keeps the suite stable.
  skip: () => env.nodeEnv === 'test',
  message: {
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  }
});

module.exports = {
  authRateLimiter
};
