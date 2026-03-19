<script setup>
import { dismissToast, toastState } from '../../services/toast';
</script>

<template>
  <div class="toast-viewport" aria-live="polite" aria-atomic="true">
    <transition-group name="toast-stack" tag="div" class="toast-stack">
      <article
        v-for="toast in toastState.items"
        :key="toast.id"
        class="toast-card"
        :class="`toast-card--${toast.tone}`"
        role="status"
      >
        <div class="toast-card__accent" aria-hidden="true"></div>
        <div class="toast-card__body">
          <p v-if="toast.title" class="toast-card__title">{{ toast.title }}</p>
          <p class="toast-card__message">{{ toast.message }}</p>
        </div>
        <button type="button" class="toast-card__close" aria-label="Dismiss notification" @click="dismissToast(toast.id)">
          ×
        </button>
      </article>
    </transition-group>
  </div>
</template>
