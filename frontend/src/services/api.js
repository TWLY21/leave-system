/*
 * Shared Axios API client for the frontend.
 * This file centralizes how browser code talks to the Express backend. It sets
 * the base API URL, automatically attaches the JWT to outgoing requests, and
 * clears the session when the backend returns 401. Every frontend page that
 * calls the backend imports this module.
 */

// Provides the HTTP client used by the Vue pages to call backend endpoints.
import axios from 'axios';
// Supplies the shared auth state and logout helper used by request and response interceptors.
import { authState, clearSession } from './auth';

// Creates a preconfigured Axios instance pointing at the backend API root.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api'
});

// Adds the Authorization header before each request when a JWT exists.
api.interceptors.request.use((config) => {
  if (authState.token) {
    // Frontend API calls include the JWT here so protected backend routes can authenticate the user.
    config.headers.Authorization = `Bearer ${authState.token}`;
  }

  return config;
});

// Handles global auth failures by clearing state and redirecting back to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

// Exports the shared HTTP client used by all page-level API calls.
export default api;
