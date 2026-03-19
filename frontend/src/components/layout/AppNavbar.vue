<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppButton from '../ui/AppButton.vue';

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['logout']);

const initials = computed(() => props.user?.username?.slice(0, 1).toUpperCase() || 'U');
</script>

<template>
  <header class="app-navbar surface-card surface-card--blurred">
    <div class="app-navbar__brand">
      <div class="app-navbar__brand-mark">LS</div>
      <div>
        <p class="eyebrow">Leave operations</p>
        <h1 class="app-navbar__title">Leave Management System</h1>
        <p class="page-copy">A clean operational view for employees and administrators.</p>
      </div>
    </div>

    <div v-if="user" class="app-navbar__controls">
      <nav class="app-navbar__nav">
        <RouterLink class="nav-link" to="/dashboard">Dashboard</RouterLink>
        <RouterLink class="nav-link" to="/apply">Apply Leave</RouterLink>
      </nav>

      <div class="app-navbar__user">
        <div class="app-navbar__avatar">{{ initials }}</div>
        <div>
          <p class="app-navbar__user-name">{{ user.username }}</p>
          <p class="app-navbar__user-role">{{ user.role }}</p>
        </div>
      </div>

      <AppButton variant="ghost" size="sm" @click="emit('logout')">Logout</AppButton>
    </div>

    <div v-else class="app-navbar__controls">
      <RouterLink class="app-button app-button--secondary app-button--sm" to="/login">Sign in</RouterLink>
      <RouterLink class="app-button app-button--primary app-button--sm" to="/register">Register</RouterLink>
    </div>
  </header>
</template>
