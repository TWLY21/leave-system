/*
 * Environment configuration loader for the backend.
 * This file reads values from backend/.env, normalizes them, and exposes the
 * settings used by the server, JWT signing, database selection, seed admin
 * account, test database reset behavior, and CORS configuration.
 *
 * Security note:
 * - Local development still gets safe-to-run defaults for convenience.
 * - Production startup is blocked if secure secrets were not supplied.
 */

// Resolves absolute paths so environment-based file locations are predictable.
const path = require('path');
// Loads variables from a local .env file into process.env.
const dotenv = require('dotenv');

// Reads backend/.env when present so local development and tests can override defaults.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Converts string environment values like "true" and "false" into booleans.
function toBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
// Development-only secret used so the portfolio project can run locally without extra setup.
const devJwtSecret = 'local-dev-jwt-secret-change-before-production';
// Default admin password kept for local demos only. Production must override it.
const defaultAdminPassword = 'Admin123!';
const jwtSecret = process.env.JWT_SECRET || devJwtSecret;
const adminPassword = process.env.ADMIN_PASSWORD || defaultAdminPassword;
const databaseUrl = (process.env.DATABASE_URL || '').trim();
const requestedDbClient = (process.env.DB_CLIENT || '').trim().toLowerCase();
const dbClient = requestedDbClient || (databaseUrl ? 'postgres' : 'sqlite');

if (!['sqlite', 'postgres'].includes(dbClient)) {
  throw new Error('DB_CLIENT must be either "sqlite" or "postgres".');
}

if (dbClient === 'postgres' && !databaseUrl) {
  throw new Error('DATABASE_URL must be set when DB_CLIENT=postgres.');
}

if (isProduction && jwtSecret === devJwtSecret) {
  throw new Error('JWT_SECRET must be set to a strong custom value when NODE_ENV=production.');
}

if (isProduction && adminPassword === defaultAdminPassword) {
  throw new Error('ADMIN_PASSWORD must be overridden when NODE_ENV=production.');
}

// Exposes a single configuration object consumed across the backend.
module.exports = {
  nodeEnv,
  isProduction,
  // Port where the Express server listens.
  port: Number(process.env.PORT || 4000),
  // Secret key used by JWT signing and verification.
  jwtSecret,
  // Selected database driver. SQLite remains useful locally, while PostgreSQL is the production-ready option.
  dbClient,
  // Connection string used by PostgreSQL deployments.
  databaseUrl,
  // Enables SSL for PostgreSQL providers such as Render when needed.
  dbSsl: toBoolean(process.env.DB_SSL || (isProduction && dbClient === 'postgres' ? 'true' : 'false')),
  // Absolute path to the SQLite database file when the sqlite driver is active.
  dbPath: path.resolve(process.cwd(), process.env.DB_PATH || 'data/leave-system.sqlite'),
  // Seeded administrator username used for initial admin login.
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  // Seeded administrator password hashed during database initialization.
  adminPassword,
  // Test helper flag that recreates the database from scratch on startup.
  resetDbOnStart: toBoolean(process.env.RESET_DB_ON_START || 'false'),
  // Frontend origin allowed by CORS when browser requests hit the API.
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
