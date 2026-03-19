<script setup>
import { computed } from 'vue';
import FormField from './FormField.vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  as: {
    type: String,
    default: 'input'
  },
  id: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  autocomplete: {
    type: String,
    default: ''
  },
  rows: {
    type: Number,
    default: 4
  },
  disabled: {
    type: Boolean,
    default: false
  },
  options: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'blur']);
const inputId = computed(() => props.id || props.name || `field-${Math.random().toString(36).slice(2, 9)}`);
const hintId = computed(() => (props.hint ? `${inputId.value}-hint` : ''));
const errorId = computed(() => (props.error ? `${inputId.value}-error` : ''));
const describedBy = computed(() => [hintId.value, errorId.value].filter(Boolean).join(' '));

function updateValue(event) {
  emit('update:modelValue', event.target.value);
}
</script>

<template>
  <FormField
    :label="label"
    :label-for="inputId"
    :hint="hint"
    :hint-id="hintId"
    :error="error"
    :error-id="errorId"
    :required="required"
  >
    <textarea
      v-if="as === 'textarea'"
      :id="inputId"
      class="form-input"
      :class="{ 'is-invalid': error }"
      :name="name || undefined"
      :rows="rows"
      :placeholder="placeholder || undefined"
      :autocomplete="autocomplete || undefined"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="describedBy || undefined"
      :value="modelValue"
      @input="updateValue"
      @blur="emit('blur')"
    />

    <select
      v-else-if="as === 'select'"
      :id="inputId"
      class="form-input form-input--select"
      :class="{ 'is-invalid': error }"
      :name="name || undefined"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="describedBy || undefined"
      :value="modelValue"
      @change="updateValue"
      @blur="emit('blur')"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <input
      v-else
      :id="inputId"
      class="form-input"
      :class="{ 'is-invalid': error }"
      :type="type"
      :name="name || undefined"
      :placeholder="placeholder || undefined"
      :autocomplete="autocomplete || undefined"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : 'false'"
      :aria-describedby="describedBy || undefined"
      :value="modelValue"
      @input="updateValue"
      @blur="emit('blur')"
    />
  </FormField>
</template>
