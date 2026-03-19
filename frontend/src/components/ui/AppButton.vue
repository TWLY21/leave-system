<script setup>
defineOptions({ inheritAttrs: false });

defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'md'
  },
  loading: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <button
    v-bind="$attrs"
    :type="type"
    class="app-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      { 'app-button--block': block, 'is-loading': loading }
    ]"
    :disabled="loading || $attrs.disabled"
    :aria-busy="loading ? 'true' : 'false'"
  >
    <span v-if="loading" class="button-spinner" aria-hidden="true"></span>
    <span class="button-label"><slot /></span>
  </button>
</template>
