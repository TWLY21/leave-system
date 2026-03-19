/*
 * Frontend router configuration.
 * This file maps browser URLs to Vue pages and guards protected routes.
 * It connects login, registration, dashboard, and apply-leave pages while
 * redirecting users based on whether a JWT-backed session exists in frontend
 * auth state.
 */

// Creates the Vue Router instance and uses HTML5 history mode.
import { createRouter, createWebHistory } from 'vue-router';
// Dashboard page shows leave data and admin review actions.
import DashboardPage from '../pages/DashboardPage.vue';
// Apply page lets an employee submit a new leave request.
import ApplyLeavePage from '../pages/ApplyLeavePage.vue';
// Login page exchanges credentials for a JWT.
import LoginPage from '../pages/LoginPage.vue';
// Register page creates a new user account through the auth API.
import RegisterPage from '../pages/RegisterPage.vue';
// Shared auth helper used to decide whether a route is accessible.
import { isAuthenticated } from '../services/auth';

// Defines all frontend routes and the page component rendered for each one.
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: { guestOnly: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/apply',
      name: 'apply',
      component: ApplyLeavePage,
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
});

// Prevents unauthenticated access to protected pages and blocks logged-in users from revisiting auth screens.
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && isAuthenticated()) {
    return { name: 'dashboard' };
  }

  return true;
});

// Exports the router so main.js can install it on the Vue app.
export default router;
