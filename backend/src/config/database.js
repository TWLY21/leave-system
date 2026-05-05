/*
 * Database bootstrap and connection access for the backend.
 * This file opens either SQLite or PostgreSQL, creates the users and leaves
 * tables, migrates legacy single-date leave rows into start/end date ranges,
 * seeds the default admin account, and exposes the shared database adapter used
 * by the model layer. All low-level database calls originate from this module
 * and the model files that call getDb().
 */

// Creates folders and removes test databases when reset mode is enabled.
const fs = require('fs');
// Resolves the directory that will contain the SQLite database file.
const path = require('path');
// Hashes the seeded admin password before it is stored in the database.
const bcrypt = require('bcryptjs');
// Provides the PostgreSQL connection pool for production-style deployments.
const { Pool } = require('pg');
// Provides the SQLite driver used by the sqlite helper package.
const sqlite3 = require('sqlite3');
// Opens an async SQLite connection with promise-based helpers.
const { open } = require('sqlite');
// Supplies the configured database driver, connection settings, and seed admin credentials.
const env = require('./env');

// Stores the singleton database connection after initialization.
let database;

function toPostgresQuery(sql, params) {
  let placeholderIndex = 0;

  return {
    text: sql.replace(/\?/g, () => `$${++placeholderIndex}`),
    values: params
  };
}

function createSqliteAdapter(sqliteDb) {
  return {
    client: 'sqlite',
    async get(sql, ...params) {
      return sqliteDb.get(sql, ...params);
    },
    async all(sql, ...params) {
      return sqliteDb.all(sql, ...params);
    },
    async run(sql, ...params) {
      return sqliteDb.run(sql, ...params);
    },
    async exec(sql) {
      return sqliteDb.exec(sql);
    }
  };
}

function createPostgresAdapter(pool) {
  return {
    client: 'postgres',
    async get(sql, ...params) {
      const query = toPostgresQuery(sql, params);
      const result = await pool.query(query.text, query.values);
      return result.rows[0] || null;
    },
    async all(sql, ...params) {
      const query = toPostgresQuery(sql, params);
      const result = await pool.query(query.text, query.values);
      return result.rows;
    },
    async run(sql, ...params) {
      const query = toPostgresQuery(sql, params);
      const result = await pool.query(query.text, query.values);

      return {
        changes: result.rowCount || 0,
        lastID: result.rows[0]?.id ?? null,
        rows: result.rows
      };
    },
    async exec(sql) {
      return pool.query(sql);
    }
  };
}

// Returns the existing database connection to model files.
async function getDb() {
  if (!database) {
    throw new Error('Database has not been initialized.');
  }

  return database;
}

async function ensureSqliteLeaveRangeSchema(db) {
  const columns = await db.all('PRAGMA table_info(leaves)');
  const columnNames = new Set(columns.map((column) => String(column.name).toLowerCase()));

  if (!columnNames.has('startdate')) {
    await db.exec('ALTER TABLE leaves ADD COLUMN startDate TEXT;');
  }

  if (!columnNames.has('enddate')) {
    await db.exec('ALTER TABLE leaves ADD COLUMN endDate TEXT;');
  }

  // Legacy rows only stored one day in leaves.date, so both range endpoints are backfilled from it.
  await db.exec(`
    UPDATE leaves
    SET startDate = COALESCE(startDate, date),
        endDate = COALESCE(endDate, date)
    WHERE startDate IS NULL OR endDate IS NULL;
  `);

  // These indexes keep user dashboards, status views, and overlap checks fast enough for a portfolio app.
  await db.exec('CREATE INDEX IF NOT EXISTS idx_leaves_user_range ON leaves (userId, startDate, endDate);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON leaves (userId, status);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_leaves_status_start ON leaves (status, startDate);');
}

async function ensurePostgresLeaveRangeSchema(db) {
  const columns = await db.all(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leaves'
  `);
  const columnNames = new Set(columns.map((column) => String(column.column_name).toLowerCase()));

  if (!columnNames.has('startdate')) {
    await db.exec('ALTER TABLE leaves ADD COLUMN startdate TEXT;');
  }

  if (!columnNames.has('enddate')) {
    await db.exec('ALTER TABLE leaves ADD COLUMN enddate TEXT;');
  }

  await db.exec(`
    UPDATE leaves
    SET startdate = COALESCE(startdate, date),
        enddate = COALESCE(enddate, date)
    WHERE startdate IS NULL OR enddate IS NULL;
  `);

  await db.exec('CREATE INDEX IF NOT EXISTS idx_leaves_user_range ON leaves (userid, startdate, enddate);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON leaves (userid, status);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_leaves_status_start ON leaves (status, startdate);');
}

async function seedAdminUser(db) {
  const existingAdmin = await db.get(
    'SELECT id, password, role FROM users WHERE username = ?',
    env.adminUsername
  );
  const passwordHash = bcrypt.hashSync(env.adminPassword, 10);

  if (!existingAdmin) {
    // Inserts the initial admin account used to approve or reject leave requests.
    await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      env.adminUsername,
      passwordHash,
      'admin'
    );
    return;
  }

  // Keeps the seeded admin credentials consistent with current env settings.
  const passwordMatches = bcrypt.compareSync(env.adminPassword, existingAdmin.password);
  const roleMatches = existingAdmin.role === 'admin';

  if (!passwordMatches || !roleMatches) {
    await db.run(
      'UPDATE users SET password = ?, role = ? WHERE id = ?',
      passwordHash,
      'admin',
      existingAdmin.id
    );
  }
}

async function initSqliteDatabase() {
  fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

  // Used mainly by Playwright test runs so each suite starts from a clean state.
  if (env.resetDbOnStart && fs.existsSync(env.dbPath)) {
    fs.rmSync(env.dbPath, { force: true });
  }

  const sqliteDb = await open({
    filename: env.dbPath,
    driver: sqlite3.Database
  });

  database = createSqliteAdapter(sqliteDb);

  // Enforces relational integrity for foreign-key references.
  await database.exec('PRAGMA foreign_keys = ON;');
  // Creates the application tables if this database file is empty.
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      startDate TEXT,
      endDate TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
      reviewerId INTEGER,
      reviewedAt TEXT,
      cancelledAt TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (reviewerId) REFERENCES users (id) ON DELETE SET NULL
    );
  `);

  await ensureSqliteLeaveRangeSchema(database);
  await seedAdminUser(database);

  return database;
}

async function initPostgresDatabase() {
  const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: env.dbSsl ? { rejectUnauthorized: false } : false
  });

  database = createPostgresAdapter(pool);

  if (env.resetDbOnStart) {
    await database.exec('DROP SCHEMA IF EXISTS public CASCADE;');
    await database.exec('CREATE SCHEMA public;');
  }

  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
      createdat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS leaves (
      id SERIAL PRIMARY KEY,
      userid INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      startdate TEXT,
      enddate TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
      reviewerid INTEGER REFERENCES users (id) ON DELETE SET NULL,
      reviewedat TIMESTAMPTZ,
      cancelledat TIMESTAMPTZ,
      createdat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensurePostgresLeaveRangeSchema(database);
  await seedAdminUser(database);

  return database;
}

// Creates the database connection, schema, and seed admin account on startup.
async function initDatabase() {
  if (database) {
    return database;
  }

  return env.dbClient === 'postgres'
    ? initPostgresDatabase()
    : initSqliteDatabase();
}

// Exports the connection getter and startup initializer to the rest of the backend.
module.exports = {
  getDb,
  initDatabase
};
