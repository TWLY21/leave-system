/*
 * Leave-request controller for employee and admin operations.
 * This file now stays intentionally thin: it translates HTTP requests into
 * service-layer calls and returns the resulting API responses. Business rules
 * live in services/leaveService.js so controllers remain easy to read.
 */

// Executes the leave business logic used by the HTTP handlers below.
const {
  cancelLeaveRequest,
  createLeaveRequest,
  deleteLeaveRequest,
  listLeavesForUser,
  reviewLeaveRequest
} = require('../services/leaveService');

// Handles GET /api/leaves and returns either the current user's leaves or all leaves for admins.
async function listLeaves(req, res) {
  const leaves = await listLeavesForUser(req.user);
  res.json({ items: leaves });
}

// Handles POST /api/leaves so an authenticated employee can create a new request.
async function applyLeave(req, res) {
  const leave = await createLeaveRequest(req.user, req.body);
  res.status(201).json({ item: leave });
}

// Handles PUT /api/leaves/:id to cancel the caller's own pending leave request.
async function cancelLeave(req, res) {
  const updatedLeave = await cancelLeaveRequest(req.user, Number(req.params.id));
  res.json({ item: updatedLeave });
}

// Handles DELETE /api/leaves/:id so a user can permanently remove their own leave request.
async function deleteLeave(req, res) {
  const result = await deleteLeaveRequest(req.user, Number(req.params.id));
  res.json(result);
}

// Handles PUT /api/leaves/:id/approve so an admin can approve a pending request.
async function approveLeave(req, res) {
  const updatedLeave = await reviewLeaveRequest(req.user, Number(req.params.id), 'approved');
  res.json({ item: updatedLeave });
}

// Handles PUT /api/leaves/:id/reject so an admin can reject a pending request.
async function rejectLeave(req, res) {
  const updatedLeave = await reviewLeaveRequest(req.user, Number(req.params.id), 'rejected');
  res.json({ item: updatedLeave });
}

// Exports the controller methods so the leave route module can attach them to endpoints.
module.exports = {
  applyLeave,
  approveLeave,
  cancelLeave,
  deleteLeave,
  listLeaves,
  rejectLeave
};
