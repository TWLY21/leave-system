<script setup>
defineProps({
  label: {
    type: String,
    default: ''
  },
  value: {
    type: [String, Number],
    default: 0
  },
  tone: {
    type: String,
    default: 'neutral'
  }
});
</script>

<template>
  <article class="metric-card" :class="`metric-card--${tone}`">
    <p class="metric-card__label">{{ label }}</p>
    <p class="metric-card__value">{{ value }}</p>
  </article>
</template>
