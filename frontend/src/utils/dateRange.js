/*
 * Shared date-range helpers for the frontend.
 * This file keeps the calendar, apply form, and dashboard using the same date
 * calculations so the UI stays consistent and easier to maintain.
 */

// Converts YYYY-MM-DD strings into UTC dates so local timezone offsets do not shift calendar days.
export function parseIsoDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Formats a Date object back into YYYY-MM-DD.
export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

// Adds or subtracts whole days without mutating the original date.
export function addDays(date, amount) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

// Expands a leave range into individual dates for disabling and counting logic.
export function enumerateDateRange(startDate, endDate) {
  const dates = [];
  let pointer = parseIsoDate(startDate);
  const last = parseIsoDate(endDate);

  while (pointer <= last) {
    dates.push(toIsoDate(pointer));
    pointer = addDays(pointer, 1);
  }

  return dates;
}

// Counts how many days exist inside an inclusive leave range.
export function countDateRangeDays(startDate, endDate) {
  return enumerateDateRange(startDate, endDate).length;
}

// Returns a stable short display string for dashboard and calendar summaries.
export function formatDisplayDate(isoDate) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parseIsoDate(isoDate));
}
