/*
 * Shared helper functions for Playwright API tests.
 * This file reduces duplication in the backend API suite by generating unique
 * users, registering them, logging them in, and logging in as the seeded admin.
 * These helpers support tests for auth, leave creation, and admin review flows.
 */

// Provides Playwright assertions used to verify API response status codes.
const { expect } = require('@playwright/test');

// Creates unique test credentials so each API test can run independently.
function buildUser(prefix = 'user') {
  const uniquePart = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `${prefix}_${uniquePart}`,
    password: 'Password123!'
  };
}

// Calls POST /api/auth/register and asserts that user creation succeeds.
async function registerUser(request, user) {
  const response = await request.post('/api/auth/register', { data: user });
  expect(response.status()).toBe(201);
  return response.json();
}

// Calls POST /api/auth/login and asserts that existing credentials work.
async function loginUser(request, user) {
  const response = await request.post('/api/auth/login', { data: user });
  expect(response.status()).toBe(200);
  return response.json();
}

// Logs in with the seeded admin account to test approval and rejection flows.
async function loginAsAdmin(request) {
  const response = await request.post('/api/auth/login', {
    data: {
      username: 'admin',
      password: 'Admin123!'
    }
  });

  expect(response.status()).toBe(200);
  return response.json();
}

// Exports reusable helpers for the API test files.
module.exports = {
  buildUser,
  loginAsAdmin,
  loginUser,
  registerUser
};
