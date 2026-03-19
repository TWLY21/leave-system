/*
 * Playwright configuration for end-to-end browser tests.
 * This file tells Playwright to start both the backend and frontend, open the
 * Vue app in a real browser, and run the scenario in e2e/playwright. It verifies
 * the full user journey from UI interaction through backend API and database.
 */

// Provides the Playwright configuration helper.
const { defineConfig } = require('@playwright/test');

// Exports the browser E2E test runner configuration.
module.exports = defineConfig({
  // Points Playwright at the browser-driven end-to-end tests.
  testDir: './e2e/playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    // Base URL of the Vue frontend started by the webServer section below.
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      // Starts the backend API that the Vue app will call during the E2E flow.
      command: 'npm --workspace backend run start:test',
      url: 'http://127.0.0.1:4000/health',
      cwd: __dirname,
      reuseExistingServer: !process.env.CI,
      env: {
        // Runs against a clean test database and allows the local frontend origin.
        NODE_ENV: 'test',
        PORT: '4000',
        DB_PATH: 'data/test-e2e.sqlite',
        RESET_DB_ON_START: 'true',
        JWT_SECRET: 'test-secret',
        CORS_ORIGIN: 'http://127.0.0.1:4173'
      }
    },
    {
      // Starts the Vue development server used by the browser test.
      command: 'npm --workspace frontend run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      cwd: __dirname,
      reuseExistingServer: !process.env.CI,
      env: {
        // Points frontend API calls at the backend test server.
        VITE_API_URL: 'http://127.0.0.1:4000/api'
      }
    }
  ]
});
