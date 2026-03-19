/*
 * Shared date-range helpers for the backend.
 * This file keeps leave-range parsing and comparison logic in one place so
 * routes, services, and tests do not duplicate the same date rules.
 */

// Simple ISO date pattern used for date-only strings like 2026-03-19.
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

// Returns true only for strict YYYY-MM-DD strings.
function isIsoDate(value) {
  return typeof value === 'string' && isoDatePattern.test(value);
}

// Normalizes legacy single-date payloads and newer start/end range payloads.
function normalizeLeaveRange(payload = {}) {
  const startDate = payload.startDate || payload.date || '';
  const endDate = payload.endDate || payload.date || '';

  return {
    startDate,
    endDate
  };
}

// ISO date strings compare lexicographically, so order checks are straightforward.
function isRangeOrdered(startDate, endDate) {
  return Boolean(startDate && endDate && startDate <= endDate);
}

// Returns true when two ranges describe the exact same leave window.
function isSameRange(existingStartDate, existingEndDate, nextStartDate, nextEndDate) {
  return existingStartDate === nextStartDate && existingEndDate === nextEndDate;
}

module.exports = {
  isIsoDate,
  isRangeOrdered,
  isSameRange,
  normalizeLeaveRange
};
