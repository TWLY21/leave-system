<script setup>
import { computed } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import AppNavbar from './components/layout/AppNavbar.vue';
import ToastViewport from './components/ui/ToastViewport.vue';
import { authState, clearSession } from './services/auth';
import { notifySuccess } from './services/toast';

const router = useRouter();
const user = computed(() => authState.user);

function logout() {
  clearSession();
  notifySuccess('Your session has been closed safely.', 'Logged out');
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__glow app-shell__glow--one"></div>
    <div class="app-shell__glow app-shell__glow--two"></div>

    <div class="app-shell__content">
      <AppNavbar :user="user" @logout="logout" />

      <main class="app-shell__main">
        <RouterView />
      </main>
    </div>

    <ToastViewport />
  </div>
</template>
