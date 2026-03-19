/*
 * Playwright configuration for backend API tests.
 * This file tells Playwright to run the API suite in backend/tests/api, start
 * the backend in test mode, point requests at http://127.0.0.1:4000, and use a
 * disposable SQLite database. It verifies backend endpoints without the frontend.
 */

// Provides the Playwright configuration helper.
const { defineConfig } = require('@playwright/test');

// Exports the API test runner configuration.
module.exports = defineConfig({
  // Points Playwright at the API-focused test files.
  testDir: './backend/tests/api',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    // Base URL used by request fixtures in the API tests.
    baseURL: 'http://127.0.0.1:4000'
  },
  webServer: {
    // Starts the backend server before the API tests run.
    command: 'npm --workspace backend run start:test',
    // Waits for the backend health endpoint to respond before starting tests.
    url: 'http://127.0.0.1:4000/health',
    cwd: __dirname,
    reuseExistingServer: !process.env.CI,
    env: {
      // Runs the backend with a clean test database and dedicated JWT secret.
      NODE_ENV: 'test',
      PORT: '4000',
      DB_PATH: 'data/test-api.sqlite',
      RESET_DB_ON_START: 'true',
      JWT_SECRET: 'test-secret'
    }
  }
});
