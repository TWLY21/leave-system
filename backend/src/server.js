/*
 * Backend startup entry point.
 * This file initializes the configured database before accepting requests and
 * then starts the Express server on the configured port. It is the process
 * launched by npm run start, npm run dev, and Playwright's webServer config.
 */

// Imports the fully configured Express application from app.js.
const app = require('./app');
// Provides the configured port value.
const env = require('./config/env');
// Initializes database schema and seed data before the server starts.
const { initDatabase } = require('./config/database');

// Starts the database and HTTP server in the correct order.
async function start() {
  try {
    // Ensures tables and the admin account exist before any request is served.
    await initDatabase();

    // Starts listening for frontend, test, and deployment traffic.
    app.listen(env.port, () => {
      console.log(`Leave API listening on http://127.0.0.1:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

// Immediately launches the backend when this file is executed by Node.js.
start();
