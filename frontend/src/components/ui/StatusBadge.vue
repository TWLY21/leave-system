<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: {
    type: String,
    default: 'unknown'
  }
});

const tone = computed(() => {
  if (props.value === 'approved') return 'success';
  if (props.value === 'pending') return 'warning';
  if (props.value === 'rejected') return 'danger';
  if (props.value === 'cancelled') return 'neutral';
  return 'neutral';
});
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">
    <span class="status-badge__dot" aria-hidden="true"></span>
    <span>{{ value }}</span>
  </span>
</template>
