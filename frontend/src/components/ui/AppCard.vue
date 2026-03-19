<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default'
  }
});
</script>

<template>
  <section class="surface-card" :class="`surface-card--${variant}`">
    <slot />
  </section>
</template>
