/*
 * User data-access layer for the backend.
 * This file is responsible for direct SQL interaction with the users table.
 * Authentication logic calls these functions whenever it needs to create a user
 * or read user records during registration, login, and token refresh checks.
 */

// Gives this model access to the shared database adapter.
const { getDb } = require('../config/database');

const publicUserSelect = 'SELECT id, username, role, createdat AS "createdAt" FROM users';
const privateUserSelect = 'SELECT id, username, password, role, createdat AS "createdAt" FROM users';

// Inserts a new user row and returns the newly created public user record.
async function createUser({ username, passwordHash, role = 'user' }) {
  const db = await getDb();

  if (db.client === 'postgres') {
    // PostgreSQL can return the inserted row directly, which avoids a second round trip.
    return db.get(
      `
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
        RETURNING id, username, role, createdat AS "createdAt"
      `,
      username,
      passwordHash,
      role
    );
  }

  // SQLite write: create a new user in the users table.
  const result = await db.run(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    username,
    passwordHash,
    role
  );

  return findUserById(result.lastID);
}

// Reads a single user by username, including the password hash for login validation.
async function findUserByUsername(username) {
  const db = await getDb();
  // Database read: used by both registration duplicate checks and login.
  return db.get(`${privateUserSelect} WHERE username = ?`, username);
}

// Reads a user by numeric id and returns the public fields used in API responses.
async function findUserById(id) {
  const db = await getDb();
  // Database read: used after inserts and during auth middleware refresh checks.
  return db.get(`${publicUserSelect} WHERE id = ?`, id);
}

// Exports model functions to the auth controller.
module.exports = {
  createUser,
  findUserById,
  findUserByUsername
};
