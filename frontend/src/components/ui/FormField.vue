<script setup>
defineProps({
  label: {
    type: String,
    default: ''
  },
  labelFor: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  hintId: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  errorId: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div class="form-field" :class="{ 'has-error': error }">
    <label v-if="label" class="form-field__label" :for="labelFor || undefined">
      {{ label }}
      <span v-if="required" class="form-field__required">*</span>
    </label>
    <span v-if="hint" :id="hintId || undefined" class="form-field__hint">{{ hint }}</span>
    <slot />
    <span v-if="error" :id="errorId || undefined" class="form-field__error" role="alert">{{ error }}</span>
  </div>
</template>
