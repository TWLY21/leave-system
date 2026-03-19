<script setup>
const props = defineProps({
  rows: {
    type: Number,
    default: 6
  },
  columns: {
    type: Number,
    default: 6
  }
});
</script>

<template>
  <div class="table-skeleton" aria-hidden="true">
    <div v-for="row in props.rows" :key="row" class="table-skeleton__row">
      <span v-for="column in props.columns" :key="`${row}-${column}`" class="table-skeleton__cell"></span>
    </div>
  </div>
</template>
