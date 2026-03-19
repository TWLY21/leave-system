/*
 * Leave business service for the backend.
 * This file keeps leave workflow rules separate from HTTP controllers so the
 * project is easier to grow, test, and reason about. Controllers call into this
 * module for create/read/update/delete behavior, while the model layer stays
 * focused on raw database access.
 */

// Performs leave-related database calls such as create, read, update, and delete.
const {
  createLeave,
  deleteLeaveById,
  findAllLeaves,
  findLeaveById,
  findLeavesByUserId,
  findOverlappingLeaveForUser,
  updateLeaveStatus
} = require('../models/leaveModel');
// Shared range helpers prevent duplicated date-rule logic.
const { isRangeOrdered, isSameRange, normalizeLeaveRange } = require('../utils/dateRange');
// Produces structured API errors when ownership, state, or validation checks fail.
const HttpError = require('../utils/httpError');

// Returns the correct leave list for the current user's role.
async function listLeavesForUser(currentUser) {
  return currentUser.role === 'admin'
    ? findAllLeaves()
    : findLeavesByUserId(currentUser.id);
}

// Creates a leave request after enforcing duplicate and overlap rules.
async function createLeaveRequest(currentUser, payload) {
  const { startDate, endDate } = normalizeLeaveRange(payload);

  if (!isRangeOrdered(startDate, endDate)) {
    throw new HttpError(422, 'End date must be the same day or later than the start date.');
  }

  const conflictingLeave = await findOverlappingLeaveForUser(currentUser.id, startDate, endDate);

  if (conflictingLeave) {
    if (isSameRange(conflictingLeave.startDate, conflictingLeave.endDate, startDate, endDate)) {
      throw new HttpError(
        400,
        startDate === endDate ? 'Leave already applied for this date' : 'Leave already applied for this date range'
      );
    }

    throw new HttpError(400, 'Leave dates overlap with an existing request');
  }

  return createLeave({
    userId: currentUser.id,
    startDate,
    endDate,
    reason: payload.reason
  });
}

// Reads one leave and throws a 404 when the requested record does not exist.
async function getLeaveOrThrow(leaveId) {
  const leave = await findLeaveById(leaveId);

  if (!leave) {
    throw new HttpError(404, 'Leave request was not found.');
  }

  return leave;
}

// Cancels a pending leave that belongs to the current user.
async function cancelLeaveRequest(currentUser, leaveId) {
  const leave = await getLeaveOrThrow(leaveId);

  if (leave.userId !== currentUser.id) {
    throw new HttpError(403, 'You can only cancel your own leave request.');
  }

  if (leave.status !== 'pending') {
    throw new HttpError(400, 'Only pending leave requests can be cancelled.');
  }

  return updateLeaveStatus({
    id: leaveId,
    status: 'cancelled',
    cancelledAt: new Date().toISOString()
  });
}

// Deletes a leave owned by the current user.
async function deleteLeaveRequest(currentUser, leaveId) {
  const leave = await getLeaveOrThrow(leaveId);

  if (leave.userId !== currentUser.id) {
    throw new HttpError(403, 'You can only delete your own leave request.');
  }

  await deleteLeaveById(leaveId);
  return { message: 'Leave request deleted successfully.' };
}

// Applies an admin review action to a pending leave request.
async function reviewLeaveRequest(currentUser, leaveId, decision) {
  const leave = await getLeaveOrThrow(leaveId);

  if (currentUser.role !== 'admin') {
    throw new HttpError(403, 'You do not have permission to perform this action.');
  }

  if (leave.status !== 'pending') {
    const actionLabel = decision === 'approved' ? 'approved' : 'rejected';
    throw new HttpError(400, `Only pending leave requests can be ${actionLabel}.`);
  }

  return updateLeaveStatus({
    id: leaveId,
    status: decision,
    reviewerId: currentUser.id,
    reviewedAt: new Date().toISOString()
  });
}

module.exports = {
  cancelLeaveRequest,
  createLeaveRequest,
  deleteLeaveRequest,
  listLeavesForUser,
  reviewLeaveRequest
};
