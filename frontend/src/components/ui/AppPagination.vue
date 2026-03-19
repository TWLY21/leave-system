<script setup>
import { computed } from 'vue';
import AppButton from './AppButton.vue';

const props = defineProps({
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  }
});

const emit = defineEmits(['update:page']);

const pages = computed(() => Array.from({ length: props.totalPages }, (_, index) => index + 1));

function goToPage(page) {
  if (page < 1 || page > props.totalPages || page === props.currentPage) {
    return;
  }

  emit('update:page', page);
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Leave request pages">
    <AppButton variant="ghost" size="sm" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
      Previous
    </AppButton>

    <div class="pagination__pages">
      <button
        v-for="page in pages"
        :key="page"
        type="button"
        class="pagination__page"
        :class="{ 'is-active': page === currentPage }"
        :aria-current="page === currentPage ? 'page' : undefined"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>
    </div>

    <AppButton variant="ghost" size="sm" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
      Next
    </AppButton>
  </nav>
</template>
