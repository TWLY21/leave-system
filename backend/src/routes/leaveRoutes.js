/*
 * Leave management route definitions for the backend API.
 * This file maps leave endpoints to authentication, authorization, validation,
 * and controller logic. Endpoints:
 * - GET /api/leaves: list leaves for the current user or all leaves for admins
 * - POST /api/leaves: create a new leave request for one day or a full date range
 * - PUT /api/leaves/:id: cancel the caller's own pending leave request
 * - DELETE /api/leaves/:id: delete the caller's own leave request
 * - PUT /api/leaves/:id/approve: approve a pending request as admin
 * - PUT /api/leaves/:id/reject: reject a pending request as admin
 */

// Creates an isolated Express router for leave endpoints.
const { Router } = require('express');
// Builds validators for request params and request bodies.
const { body, param } = require('express-validator');
// Supplies the leave business logic executed after middleware passes.
const {
  applyLeave,
  approveLeave,
  cancelLeave,
  deleteLeave,
  listLeaves,
  rejectLeave
} = require('../controllers/leaveController');
// JWT authentication and role-based authorization middleware live here.
const { authenticate, authorize } = require('../middleware/auth');
// Converts express-validator failures into structured API errors.
const validate = require('../middleware/validate');
// Shared helpers keep route validation readable and reusable.
const { isIsoDate, isRangeOrdered, normalizeLeaveRange } = require('../utils/dateRange');

// Router instance mounted by app.js at /api/leaves.
const router = Router();

// Every leave endpoint requires a valid JWT before any controller runs.
router.use(authenticate);

// GET /api/leaves reads leave data for the logged-in user or the admin queue.
router.get('/', listLeaves);

// POST /api/leaves normalizes single-day or range input before creating a pending leave request.
router.post(
  '/',
  [
    body().custom((_, { req }) => {
      const { startDate, endDate } = normalizeLeaveRange(req.body);

      if (!startDate || !endDate) {
        throw new Error('Provide a leave date or both startDate and endDate.');
      }

      if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
        throw new Error('Leave dates must use ISO-8601 format (YYYY-MM-DD).');
      }

      if (!isRangeOrdered(startDate, endDate)) {
        throw new Error('End date must be the same day or later than the start date.');
      }

      // The controller and service always read normalized range fields, even for single-day requests.
      req.body.startDate = startDate;
      req.body.endDate = endDate;
      req.body.date = startDate;
      return true;
    }),
    body('reason')
      .trim()
      .isLength({ min: 5, max: 300 })
      .withMessage('Reason must be between 5 and 300 characters.')
  ],
  validate,
  applyLeave
);

// PUT /api/leaves/:id validates the id before cancelling a pending leave request.
router.put(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Leave id must be a positive integer.')],
  validate,
  cancelLeave
);

// DELETE /api/leaves/:id validates the id before deleting the caller's own leave request.
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Leave id must be a positive integer.')],
  validate,
  deleteLeave
);

// PUT /api/leaves/:id/approve requires admin role before approving a request.
router.put(
  '/:id/approve',
  [param('id').isInt({ min: 1 }).withMessage('Leave id must be a positive integer.')],
  validate,
  authorize('admin'),
  approveLeave
);

// PUT /api/leaves/:id/reject requires admin role before rejecting a request.
router.put(
  '/:id/reject',
  [param('id').isInt({ min: 1 }).withMessage('Leave id must be a positive integer.')],
  validate,
  authorize('admin'),
  rejectLeave
);

// Exports the router so app.js can mount the leave API group.
module.exports = router;
