<script setup>
import { computed, ref, watch } from 'vue';
import { addDays, countDateRangeDays, formatDisplayDate, parseIsoDate, toIsoDate } from '../../utils/dateRange';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ startDate: '', endDate: '' })
  },
  disabledDates: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue']);
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});
const activeBoundary = ref('start');
const todayIso = toIsoDate(new Date());
const currentMonth = ref(
  startOfMonth(props.modelValue.startDate ? parseIsoDate(props.modelValue.startDate) : new Date())
);

const selectedStart = computed(() => props.modelValue?.startDate || '');
const selectedEnd = computed(() => props.modelValue?.endDate || '');
const disabledSet = computed(() => new Set(props.disabledDates));
const monthLabel = computed(() => monthFormatter.format(currentMonth.value));
const selectionSummary = computed(() => {
  if (!selectedStart.value) {
    return 'Pick a start date to begin your request.';
  }

  if (!selectedEnd.value || selectedStart.value === selectedEnd.value) {
    return `Selected: ${formatDisplayDate(selectedStart.value)} (1 day)`;
  }

  return `Selected: ${formatDisplayDate(selectedStart.value)} to ${formatDisplayDate(selectedEnd.value)} (${countDateRangeDays(selectedStart.value, selectedEnd.value)} days)`;
});

watch(
  () => props.modelValue,
  (value) => {
    if (!value?.startDate) {
      activeBoundary.value = 'start';
      return;
    }

    currentMonth.value = startOfMonth(parseIsoDate(value.startDate));
  },
  { deep: true }
);

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function enumerateDates(startDate, endDate) {
  const dates = [];
  let pointer = parseIsoDate(startDate);
  const last = parseIsoDate(endDate);

  while (pointer <= last) {
    dates.push(toIsoDate(pointer));
    pointer = addDays(pointer, 1);
  }

  return dates;
}

function shiftMonth(offset) {
  currentMonth.value = addMonths(currentMonth.value, offset);
}

function pickStartMode() {
  activeBoundary.value = 'start';
}

function pickEndMode() {
  if (!selectedStart.value) {
    activeBoundary.value = 'start';
    return;
  }

  activeBoundary.value = 'end';
}

function resetSelection() {
  emit('update:modelValue', { startDate: '', endDate: '' });
  activeBoundary.value = 'start';
}

function rangeTouchesDisabled(startDate, endDate) {
  return enumerateDates(startDate, endDate).some((isoDate) => disabledSet.value.has(isoDate));
}

function isInRange(isoDate) {
  if (!selectedStart.value || !selectedEnd.value) {
    return false;
  }

  return isoDate >= selectedStart.value && isoDate <= selectedEnd.value;
}

function isEdge(isoDate) {
  return isoDate === selectedStart.value || isoDate === selectedEnd.value;
}

function isCellDisabled(cell) {
  if (!cell.inCurrentMonth) {
    return true;
  }

  if (disabledSet.value.has(cell.iso)) {
    return true;
  }

  // When the user is extending a range, days before the chosen start or ranges that cross blocked dates stay unavailable.
  if (activeBoundary.value === 'end' && selectedStart.value) {
    if (cell.iso < selectedStart.value) {
      return true;
    }

    return rangeTouchesDisabled(selectedStart.value, cell.iso);
  }

  return false;
}

const calendarDays = computed(() => {
  const firstVisibleDay = addDays(currentMonth.value, -currentMonth.value.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstVisibleDay, index);
    const iso = toIsoDate(date);

    return {
      iso,
      label: String(date.getUTCDate()),
      inCurrentMonth: date.getUTCMonth() === currentMonth.value.getUTCMonth()
    };
  });
});

function selectDay(cell) {
  if (isCellDisabled(cell)) {
    return;
  }

  if (activeBoundary.value === 'start' || !selectedStart.value) {
    emit('update:modelValue', {
      startDate: cell.iso,
      endDate: cell.iso
    });
    activeBoundary.value = 'end';
    return;
  }

  emit('update:modelValue', {
    startDate: selectedStart.value,
    endDate: cell.iso
  });
  activeBoundary.value = 'start';
}
</script>

<template>
  <div class="range-picker">
    <div class="range-picker__header">
      <div>
        <h4 class="section-title">Select leave dates</h4>
        <p class="page-copy">Grey dates are already used by your own leave requests and cannot be selected again.</p>
      </div>

      <div class="range-picker__mode-switcher" role="group" aria-label="Date selection mode">
        <button
          type="button"
          class="mode-chip"
          :class="{ 'is-active': activeBoundary === 'start' }"
          @click="pickStartMode"
        >
          Start date
        </button>
        <button
          type="button"
          class="mode-chip"
          :class="{ 'is-active': activeBoundary === 'end' }"
          :disabled="!selectedStart"
          @click="pickEndMode"
        >
          End date
        </button>
      </div>
    </div>

    <div class="range-picker__toolbar">
      <button type="button" class="calendar-nav" aria-label="Show previous month" @click="shiftMonth(-1)">
        <span aria-hidden="true">&lsaquo;</span>
      </button>
      <p class="range-picker__month">{{ monthLabel }}</p>
      <button type="button" class="calendar-nav" aria-label="Show next month" @click="shiftMonth(1)">
        <span aria-hidden="true">&rsaquo;</span>
      </button>
    </div>

    <div class="range-picker__weekdays">
      <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
    </div>

    <div class="range-picker__grid">
      <button
        v-for="cell in calendarDays"
        :key="cell.iso"
        type="button"
        class="calendar-day"
        :class="{
          'is-outside': !cell.inCurrentMonth,
          'is-disabled': isCellDisabled(cell),
          'is-selected': isEdge(cell.iso),
          'is-in-range': isInRange(cell.iso),
          'is-today': cell.iso === todayIso
        }"
        :disabled="isCellDisabled(cell)"
        :aria-label="`Pick ${cell.iso}`"
        @click="selectDay(cell)"
      >
        <span>{{ cell.label }}</span>
      </button>
    </div>

    <div class="range-picker__footer">
      <p class="range-picker__summary">{{ selectionSummary }}</p>
      <button type="button" class="range-picker__clear" @click="resetSelection">Clear selection</button>
    </div>
  </div>
</template>
