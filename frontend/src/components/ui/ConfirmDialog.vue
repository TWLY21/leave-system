<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirm action'
  },
  message: {
    type: String,
    default: 'Please confirm this action.'
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <div v-if="open" class="confirm-dialog" role="dialog" aria-modal="true" :aria-label="title">
    <div class="confirm-dialog__backdrop" @click="emit('cancel')"></div>

    <div class="confirm-dialog__panel surface-card surface-card--blurred">
      <div class="confirm-dialog__content">
        <p class="eyebrow">Confirmation</p>
        <h3 class="section-title">{{ title }}</h3>
        <p class="page-copy">{{ message }}</p>
      </div>

      <div class="confirm-dialog__actions">
        <button type="button" class="app-button app-button--secondary app-button--md" :disabled="loading" @click="emit('cancel')">
          {{ cancelText }}
        </button>
        <button type="button" class="app-button app-button--danger app-button--md" :disabled="loading" @click="emit('confirm')">
          <span v-if="loading" class="button-spinner" aria-hidden="true"></span>
          <span class="button-label">{{ loading ? 'Working...' : confirmText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
