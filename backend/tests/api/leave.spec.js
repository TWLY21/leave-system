/*
 * Playwright API tests for leave-management endpoints.
 * These tests verify the main backend workflow beyond authentication:
 * creating a leave request, reading it back from the dashboard endpoint,
 * rejecting duplicate or overlapping ranges for the same user, validating bad
 * input, enforcing 401/403 cases, allowing an admin to approve a pending
 * request, and allowing an owner to delete their own request while blocking
 * other users from deleting it.
 */

// Provides the Playwright API test runner and assertions.
const { test, expect } = require('@playwright/test');
// Used to create an intentionally expired token for auth failure coverage.
const jwt = require('jsonwebtoken');
// Reuses helper utilities for creating users and authenticating as admin.
const { buildUser, loginAsAdmin, registerUser } = require('./helpers');
// Reads the same JWT secret used by the backend server under test.
const env = require('../../src/config/env');

// Groups leave endpoint tests under one suite name.
test.describe('leave API', () => {
  // Checks create + read behavior by posting a leave request and then listing the user's leaves.
  test('creates a leave request and returns it in the user dashboard list', async ({ request }) => {
    const credentials = buildUser('leave');
    const auth = await registerUser(request, credentials);

    const createResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${auth.token}`
      },
      data: {
        startDate: '2026-04-15',
        endDate: '2026-04-17',
        reason: 'Medical appointment with recovery time.'
      }
    });

    expect(createResponse.status()).toBe(201);
    const createdBody = await createResponse.json();
    expect(createdBody.item).toMatchObject({
      status: 'pending',
      startDate: '2026-04-15',
      endDate: '2026-04-17'
    });

    const listResponse = await request.get('/api/leaves', {
      headers: {
        Authorization: `Bearer ${auth.token}`
      }
    });

    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0]).toMatchObject({
      reason: 'Medical appointment with recovery time.',
      status: 'pending',
      username: credentials.username,
      startDate: '2026-04-15',
      endDate: '2026-04-17'
    });
  });

  // Checks that missing authentication is rejected.
  test('rejects leave access when no token is provided', async ({ request }) => {
    const response = await request.get('/api/leaves');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Authentication token is required.');
  });

  // Checks that expired JWTs are rejected during protected requests.
  test('rejects an expired authentication token', async ({ request }) => {
    const expiredToken = jwt.sign(
      {
        id: 999999,
        username: 'expired-user',
        role: 'user'
      },
      env.jwtSecret,
      { expiresIn: -60 }
    );

    const response = await request.get('/api/leaves', {
      headers: {
        Authorization: `Bearer ${expiredToken}`
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Authentication token is invalid.');
  });

  // Checks that the backend blocks duplicate single-day requests for the same user.
  test('prevents a user from applying for the same leave date twice', async ({ request }) => {
    const credentials = buildUser('duplicate');
    const employee = await registerUser(request, credentials);

    const firstResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      },
      data: {
        startDate: '2026-04-20',
        endDate: '2026-04-20',
        reason: 'First request on this date.'
      }
    });

    expect(firstResponse.status()).toBe(201);

    const duplicateResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      },
      data: {
        startDate: '2026-04-20',
        endDate: '2026-04-20',
        reason: 'Second request on the same date.'
      }
    });

    expect(duplicateResponse.status()).toBe(400);
    const duplicateBody = await duplicateResponse.json();
    expect(duplicateBody.message).toBe('Leave already applied for this date');
  });

  // Checks that the backend blocks overlapping multi-day requests for the same user.
  test('prevents a user from applying for an overlapping leave range', async ({ request }) => {
    const credentials = buildUser('overlap');
    const employee = await registerUser(request, credentials);

    const firstResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      },
      data: {
        startDate: '2026-04-25',
        endDate: '2026-04-27',
        reason: 'First multi-day request.'
      }
    });

    expect(firstResponse.status()).toBe(201);

    const overlappingResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      },
      data: {
        startDate: '2026-04-27',
        endDate: '2026-04-29',
        reason: 'Second request that overlaps the first one.'
      }
    });

    expect(overlappingResponse.status()).toBe(400);
    const overlapBody = await overlappingResponse.json();
    expect(overlapBody.message).toBe('Leave dates overlap with an existing request');
  });

  // Checks that invalid date ordering is rejected by route validation.
  test('rejects an invalid leave range where the end date is before the start date', async ({ request }) => {
    const employee = await registerUser(request, buildUser('range'));

    const response = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      },
      data: {
        startDate: '2026-05-10',
        endDate: '2026-05-08',
        reason: 'This range is invalid.'
      }
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.message).toBe('Validation failed.');
  });

  // Checks admin-only behavior by ensuring a normal user cannot approve another leave request.
  test('prevents a non-admin user from approving a leave request', async ({ request }) => {
    const owner = await registerUser(request, buildUser('ownapp'));
    const nonAdmin = await registerUser(request, buildUser('empapp'));

    const createResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${owner.token}`
      },
      data: {
        startDate: '2026-05-12',
        endDate: '2026-05-13',
        reason: 'Needs admin review.'
      }
    });

    const createBody = await createResponse.json();

    const approveResponse = await request.put(`/api/leaves/${createBody.item.id}/approve`, {
      headers: {
        Authorization: `Bearer ${nonAdmin.token}`
      }
    });

    expect(approveResponse.status()).toBe(403);
    const approveBody = await approveResponse.json();
    expect(approveBody.message).toBe('You do not have permission to perform this action.');
  });

  // Checks admin update behavior by approving a leave through the protected admin endpoint.
  test('allows an admin to approve a pending leave request', async ({ request }) => {
    const credentials = buildUser('approval');
    const employee = await registerUser(request, credentials);

    const createResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      },
      data: {
        startDate: '2026-05-02',
        endDate: '2026-05-03',
        reason: 'Family commitment requiring time away.'
      }
    });

    const createBody = await createResponse.json();
    const admin = await loginAsAdmin(request);

    const approveResponse = await request.put(`/api/leaves/${createBody.item.id}/approve`, {
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });

    expect(approveResponse.status()).toBe(200);
    const approveBody = await approveResponse.json();
    expect(approveBody.item).toMatchObject({
      status: 'approved',
      reviewerUsername: 'admin'
    });
  });

  // Checks that an owner can delete their own leave request and that it disappears from the list.
  test('allows a user to delete their own leave request', async ({ request }) => {
    const credentials = buildUser('delete');
    const employee = await registerUser(request, credentials);

    const createResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      },
      data: {
        startDate: '2026-06-14',
        endDate: '2026-06-15',
        reason: 'Personal errand that no longer requires leave.'
      }
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();

    const deleteResponse = await request.delete(`/api/leaves/${createBody.item.id}`, {
      headers: {
        Authorization: `Bearer ${employee.token}`
      }
    });

    expect(deleteResponse.status()).toBe(200);
    const deleteBody = await deleteResponse.json();
    expect(deleteBody.message).toBe('Leave request deleted successfully.');

    const listResponse = await request.get('/api/leaves', {
      headers: {
        Authorization: `Bearer ${employee.token}`
      }
    });

    const listBody = await listResponse.json();
    expect(listBody.items).toHaveLength(0);
  });

  // Checks that one user cannot delete another user's leave request.
  test('prevents one user from deleting another user\'s leave request', async ({ request }) => {
    const owner = await registerUser(request, buildUser('owner'));
    const otherUser = await registerUser(request, buildUser('other'));

    const createResponse = await request.post('/api/leaves', {
      headers: {
        Authorization: `Bearer ${owner.token}`
      },
      data: {
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        reason: 'Private appointment.'
      }
    });

    const createBody = await createResponse.json();

    const deleteResponse = await request.delete(`/api/leaves/${createBody.item.id}`, {
      headers: {
        Authorization: `Bearer ${otherUser.token}`
      }
    });

    expect(deleteResponse.status()).toBe(403);
    const errorBody = await deleteResponse.json();
    expect(errorBody.message).toBe('You can only delete your own leave request.');
  });
});
