/*
 * Frontend entry point for the Vue application.
 * This file creates the Vue app, installs the router, loads global styles, and
 * mounts the SPA into index.html. It is the browser-side starting point that
 * connects the frontend pages to the backend-driven workflow.
 */

// Creates the Vue application instance.
import { createApp } from 'vue';
// Imports the root shell component that renders navigation and page content.
import App from './App.vue';
// Imports the router that maps URLs to pages like login, dashboard, and apply leave.
import router from './router';
// Imports the shared global CSS used across all pages and components.
import './style.css';

// Creates the app, registers router-based navigation, and mounts to the #app element.
createApp(App).use(router).mount('#app');
