/*
 * Frontend authentication state module.
 * This file is the lightweight state-management layer for the Vue app. It keeps
 * the current token and user object in a shared reactive object, synchronizes
 * that state with localStorage, and exposes helpers used by pages and router
 * guards. This is where frontend session state lives.
 *
 * Security note:
 * - localStorage is acceptable for this demo and portfolio project because it
 *   keeps setup simple and easy to explain.
 * - In production, storing tokens in localStorage is not recommended because an
 *   XSS bug could expose them.
 * - A safer real-world approach is an httpOnly secure cookie plus CSRF
 *   protection on state-changing requests.
 */

// Creates a reactive object that Vue components can read and react to.
import { reactive } from 'vue';

// Reads the saved JWT from localStorage so refreshes keep the session alive.
const storedToken = localStorage.getItem('leave_token');
// Reads the saved user profile from localStorage.
const storedUser = localStorage.getItem('leave_user');

// Shared application state used by App.vue, the router, and page components.
export const authState = reactive({
  token: storedToken || '',
  user: storedUser ? JSON.parse(storedUser) : null
});

// Writes a successful login response into reactive state and browser storage.
export function setSession(payload) {
  authState.token = payload.token;
  authState.user = payload.user;
  localStorage.setItem('leave_token', payload.token);
  localStorage.setItem('leave_user', JSON.stringify(payload.user));
}

// Clears the current session from memory and localStorage during logout or 401 responses.
export function clearSession() {
  authState.token = '';
  authState.user = null;
  localStorage.removeItem('leave_token');
  localStorage.removeItem('leave_user');
}

// Returns true when a token exists, which route guards use for protected pages.
export function isAuthenticated() {
  return Boolean(authState.token);
}
