/*
 * Leave data-access layer for the backend.
 * This file contains the SQL used by leave services to create, read, update,
 * and delete leave requests. It is the main place where leave-related database
 * calls happen in the application, including the overlap query that protects
 * each user from submitting duplicate or conflicting leave ranges.
 */

// Gives the model access to the shared database adapter.
const { getDb } = require('../config/database');

// Shared SELECT statement that joins leave records with employee and reviewer usernames.
const leaveSelect = `
  SELECT
    leaves.id,
    leaves.userid AS "userId",
    users.username,
    leaves.date,
    leaves.startdate AS "startDate",
    leaves.enddate AS "endDate",
    leaves.reason,
    leaves.status,
    leaves.reviewedat AS "reviewedAt",
    leaves.cancelledat AS "cancelledAt",
    leaves.createdat AS "createdAt",
    leaves.updatedat AS "updatedAt",
    reviewer.username AS "reviewerUsername"
  FROM leaves
  JOIN users ON users.id = leaves.userid
  LEFT JOIN users AS reviewer ON reviewer.id = leaves.reviewerid
`;

// Inserts a new leave request and then re-reads it with joined display fields.
async function createLeave({ userId, startDate, endDate, reason }) {
  const db = await getDb();

  if (db.client === 'postgres') {
    // PostgreSQL can return the inserted id directly, then the joined read keeps the response shape identical.
    const created = await db.get(
      `
        INSERT INTO leaves (userid, date, startdate, enddate, reason)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id
      `,
      userId,
      startDate,
      startDate,
      endDate,
      reason
    );

    return findLeaveById(created.id);
  }

  // Database write: create a pending leave request and persist both range endpoints.
  const result = await db.run(
    'INSERT INTO leaves (userid, date, startdate, enddate, reason) VALUES (?, ?, ?, ?, ?)',
    userId,
    startDate,
    startDate,
    endDate,
    reason
  );

  return findLeaveById(result.lastID);
}

// Reads a single leave request by id.
async function findLeaveById(id) {
  const db = await getDb();
  // Database read: used before updates, deletes, and when returning a newly created or updated record.
  return db.get(`${leaveSelect} WHERE leaves.id = ?`, id);
}

// Reads an existing leave request for one user that overlaps the proposed range.
async function findOverlappingLeaveForUser(userId, startDate, endDate) {
  const db = await getDb();
  // Database read: ISO-8601 strings compare lexicographically, so this catches exact duplicates and overlapping ranges.
  return db.get(
    `${leaveSelect} WHERE leaves.userid = ? AND leaves.startdate <= ? AND leaves.enddate >= ? ORDER BY leaves.startdate ASC LIMIT 1`,
    userId,
    endDate,
    startDate
  );
}

// Reads all leave requests for one specific employee.
async function findLeavesByUserId(userId) {
  const db = await getDb();
  // Database read: powers the employee dashboard list.
  return db.all(
    `${leaveSelect} WHERE leaves.userid = ? ORDER BY leaves.startdate DESC, leaves.id DESC`,
    userId
  );
}

// Reads every leave request so administrators can review the full queue.
async function findAllLeaves() {
  const db = await getDb();
  // Database read: powers the admin dashboard view.
  return db.all(`${leaveSelect} ORDER BY leaves.startdate DESC, leaves.id DESC`);
}

// Updates a leave record's status and review metadata, then re-reads the result.
async function updateLeaveStatus({ id, status, reviewerId = null, reviewedAt = null, cancelledAt = null }) {
  const db = await getDb();
  // Database write: used for cancel, approve, and reject operations.
  await db.run(
    `
      UPDATE leaves
      SET status = ?, reviewerid = ?, reviewedat = ?, cancelledat = ?, updatedat = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    status,
    reviewerId,
    reviewedAt,
    cancelledAt,
    id
  );

  return findLeaveById(id);
}

// Permanently removes a leave request row by id.
async function deleteLeaveById(id) {
  const db = await getDb();
  // Database write: hard delete of a leave request owned by the caller.
  const result = await db.run('DELETE FROM leaves WHERE id = ?', id);
  return result.changes;
}

// Exports model functions to the leave service.
module.exports = {
  createLeave,
  deleteLeaveById,
  findAllLeaves,
  findLeaveById,
  findLeavesByUserId,
  findOverlappingLeaveForUser,
  updateLeaveStatus
};
