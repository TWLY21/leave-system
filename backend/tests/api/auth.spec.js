/*
 * Playwright API tests for authentication endpoints.
 * These tests verify that registration and login work end to end, that JWT
 * tokens are returned, and that validation rejects weak registration data.
 * They protect the auth contract used by the Vue frontend.
 */

// Provides the Playwright test runner and assertion helpers.
const { test, expect } = require('@playwright/test');
// Reuses helper functions to create users and call auth endpoints.
const { buildUser, loginUser, registerUser } = require('./helpers');

// Groups all authentication endpoint tests under one suite name.
test.describe('authentication API', () => {
  // Checks that POST /api/auth/register creates a user and returns a JWT payload.
  test('registers a new user and returns a JWT payload', async ({ request }) => {
    const credentials = buildUser('register');
    const responseBody = await registerUser(request, credentials);

    expect(responseBody.token).toBeTruthy();
    expect(responseBody.user).toMatchObject({
      username: credentials.username,
      role: 'user'
    });
  });

  // Checks that POST /api/auth/login accepts valid credentials for an existing user.
  test('logs in an existing user', async ({ request }) => {
    const credentials = buildUser('login');
    await registerUser(request, credentials);

    const responseBody = await loginUser(request, credentials);

    expect(responseBody.token).toBeTruthy();
    expect(responseBody.user.username).toBe(credentials.username);
  });

  // Checks that weak passwords are rejected before account creation.
  test('rejects registration with a weak password', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        username: buildUser('weak').username,
        password: 'weakpass'
      }
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.message).toBe('Validation failed.');
    expect(body.details.some((detail) => detail.msg.includes('uppercase'))).toBeTruthy();
  });
});
