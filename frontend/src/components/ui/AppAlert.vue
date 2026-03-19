<script setup>
defineProps({
  tone: {
    type: String,
    default: 'info'
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <div class="app-alert" :class="`app-alert--${tone}`" role="alert">
    <div class="app-alert__icon" aria-hidden="true">
      <span v-if="tone === 'success'">?</span>
      <span v-else-if="tone === 'error'">!</span>
      <span v-else>i</span>
    </div>
    <div>
      <p v-if="title" class="app-alert__title">{{ title }}</p>
      <p class="app-alert__message">{{ message }}</p>
      <slot />
    </div>
  </div>
</template>
