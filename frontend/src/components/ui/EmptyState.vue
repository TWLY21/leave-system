<script setup>
defineProps({
  title: {
    type: String,
    default: 'Nothing here yet'
  },
  description: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <div class="empty-state">
    <div class="empty-state__icon">+</div>
    <h3>{{ title }}</h3>
    <p class="page-copy">{{ description }}</p>
    <slot />
  </div>
</template>
