/*
 * Playwright end-to-end browser tests for the main leave workflows.
 * These tests check the highest-value scenarios in the system: an employee
 * registers through the Vue UI, submits leave, sees the request become pending,
 * then an admin logs in and approves that request. The suite also verifies that
 * an employee can delete their own request through the reusable confirmation
 * dialog.
 */

// Provides the Playwright browser test runner and assertion helpers.
const { test, expect } = require('@playwright/test');

// Builds unique employee credentials so each E2E test can create a fresh account each run.
function buildUser() {
  const uniquePart = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `employee_${uniquePart}`,
    password: 'Password123!'
  };
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildSafeRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = now.getUTCDate();
  const startDay = Math.min(today + 3, daysInMonth - 2);
  const endDay = Math.min(startDay + 2, daysInMonth);

  return {
    startDate: toIsoDate(new Date(Date.UTC(year, month, startDay))),
    endDate: toIsoDate(new Date(Date.UTC(year, month, endDay)))
  };
}

function buildSafeSingleDay(offset = 6) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = now.getUTCDate();
  const day = Math.min(today + offset, daysInMonth);
  return toIsoDate(new Date(Date.UTC(year, month, day)));
}

async function pickRange(page, startDate, endDate) {
  await page.getByRole('button', { name: `Pick ${startDate}`, exact: true }).click();

  if (startDate !== endDate) {
    await page.getByRole('button', { name: `Pick ${endDate}`, exact: true }).click();
  }
}

// Verifies the end-to-end journey: employee register -> leave submission -> admin approval.
test('employee registers, submits leave, and admin approves it', async ({ page }) => {
  const employee = buildUser();
  const range = buildSafeRange();

  await page.goto('/register');
  await page.getByLabel('Username').fill(employee.username);
  await page.getByRole('textbox', { name: 'Password *', exact: true }).fill(employee.password);
  await page.getByRole('textbox', { name: 'Confirm password *', exact: true }).fill(employee.password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Leave Dashboard' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Apply Leave' }).click();

  await pickRange(page, range.startDate, range.endDate);
  await page.getByLabel('Reason').fill('Annual family trip that was planned in advance.');
  await page.getByRole('button', { name: 'Submit leave request' }).click();

  const employeeRow = page.locator('tbody tr', {
    hasText: 'Annual family trip that was planned in advance.'
  }).first();

  await expect(employeeRow).toBeVisible();
  await expect(employeeRow.getByText('pending', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByRole('textbox', { name: 'Password *', exact: true }).fill('Admin123!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const adminRow = page.locator('tbody tr', {
    hasText: employee.username
  }).first();

  await expect(adminRow).toBeVisible();
  await adminRow.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Leave request approved.')).toBeVisible();
  await expect(adminRow.getByText('approved', { exact: true })).toBeVisible();
});

// Verifies the end-to-end journey: employee login -> leave submission -> reusable dialog delete flow.
test('employee can delete their own leave request from the dashboard', async ({ page, request }) => {
  const employee = buildUser();
  const singleDay = buildSafeSingleDay();
  const registerResponse = await request.post('http://127.0.0.1:4000/api/auth/register', {
    data: employee
  });

  expect(registerResponse.status()).toBe(201);

  await page.goto('/login');
  await page.getByLabel('Username').fill(employee.username);
  await page.getByRole('textbox', { name: 'Password *', exact: true }).fill(employee.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByRole('navigation').getByRole('link', { name: 'Apply Leave' }).click();
  await pickRange(page, singleDay, singleDay);
  await page.getByLabel('Reason').fill('Temporary request that will be removed.');
  await page.getByRole('button', { name: 'Submit leave request' }).click();

  const employeeRow = page.locator('tbody tr', {
    hasText: 'Temporary request that will be removed.'
  }).first();

  await expect(employeeRow).toBeVisible();
  await employeeRow.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('dialog', { name: 'Delete leave request' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete request' }).click();

  await expect(page.getByText('Leave request deleted successfully.')).toBeVisible();
  await expect(employeeRow).toHaveCount(0);
});
