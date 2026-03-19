<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppAlert from '../components/ui/AppAlert.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import DateRangeCalendar from '../components/ui/DateRangeCalendar.vue';
import FormField from '../components/ui/FormField.vue';
import FormInput from '../components/ui/FormInput.vue';
import api from '../services/api';
import { authState } from '../services/auth';
import { notifyError } from '../services/toast';
import { countDateRangeDays, enumerateDateRange } from '../utils/dateRange';

const router = useRouter();
const form = reactive({
  startDate: '',
  endDate: '',
  reason: ''
});
const fieldErrors = reactive({
  startDate: '',
  endDate: '',
  reason: ''
});
const errorMessage = ref('');
const loading = ref(false);
const blockedDates = ref([]);
const reasonCount = computed(() => form.reason.length);
const selectedRange = computed({
  get: () => ({
    startDate: form.startDate,
    endDate: form.endDate
  }),
  set: (value) => {
    form.startDate = value.startDate || '';
    form.endDate = value.endDate || '';
    fieldErrors.startDate = '';
    fieldErrors.endDate = '';
    errorMessage.value = '';
  }
});
const rangeSummary = computed(() => {
  if (!form.startDate || !form.endDate) {
    return 'No leave range selected yet.';
  }

  const dayCount = countDateRangeDays(form.startDate, form.endDate);
  return form.startDate === form.endDate
    ? `${form.startDate} (1 day)`
    : `${form.startDate} to ${form.endDate} (${dayCount} days)`;
});
const selectedRangeConflict = computed(() => {
  if (!form.startDate || !form.endDate) {
    return false;
  }

  return enumerateDateRange(form.startDate, form.endDate).some((isoDate) => blockedDates.value.includes(isoDate));
});

async function loadBlockedDates() {
  try {
    const { data } = await api.get('/leaves');
    const ownLeaves = data.items.filter((leave) => leave.userId === authState.user?.id);
    const nextBlockedDates = new Set();

    ownLeaves.forEach((leave) => {
      const startDate = leave.startDate || leave.date;
      const endDate = leave.endDate || leave.date;

      enumerateDateRange(startDate, endDate).forEach((isoDate) => nextBlockedDates.add(isoDate));
    });

    blockedDates.value = Array.from(nextBlockedDates).sort();
  } catch {
    blockedDates.value = [];
  }
}

function validateForm() {
  if (!form.startDate) {
    fieldErrors.startDate = 'Choose a start date.';
  } else {
    fieldErrors.startDate = '';
  }

  if (!form.endDate) {
    fieldErrors.endDate = 'Choose an end date.';
  } else if (form.startDate && form.startDate > form.endDate) {
    fieldErrors.endDate = 'End date must be the same day or later than the start date.';
  } else if (selectedRangeConflict.value) {
    fieldErrors.endDate = 'This leave range overlaps a date you already requested.';
  } else {
    fieldErrors.endDate = '';
  }

  fieldErrors.reason = form.reason.trim().length >= 5 ? '' : 'Reason must be at least 5 characters long.';
  return !fieldErrors.startDate && !fieldErrors.endDate && !fieldErrors.reason;
}

async function submit() {
  errorMessage.value = '';

  if (!validateForm()) {
    notifyError('Please correct the highlighted leave request fields.', 'Validation error');
    return;
  }

  loading.value = true;

  try {
    await api.post('/leaves', {
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason
    });
    router.push({ name: 'dashboard', query: { notice: 'created' } });
  } catch (error) {
    const message = error.response?.data?.message || 'Unable to submit leave request.';
    errorMessage.value = message;
    notifyError(message, 'Leave request failed');

    if (message.includes('Leave already applied') || message.includes('overlap')) {
      fieldErrors.endDate = message;
      await loadBlockedDates();
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadBlockedDates);
</script>

<template>
  <section class="page-stack apply-layout">
    <div class="page-heading page-heading--compact">
      <div>
        <p class="eyebrow">New request</p>
        <h2 class="page-title">Apply for leave</h2>
        <p class="page-copy">Choose a clean date range, explain the request clearly, and the system will block any overlap with your existing leave history.</p>
      </div>
    </div>

    <div class="apply-layout__grid">
      <AppCard class="request-card">
        <div class="section-heading">
          <div>
            <h3 class="section-title">Request details</h3>
            <p class="page-copy">Pick a start day, extend the range if needed, then add a concise reason for review.</p>
          </div>
        </div>

        <AppAlert
          v-if="errorMessage"
          tone="error"
          title="Submission failed"
          :message="errorMessage"
        />

        <form class="form-stack" @submit.prevent="submit">
          <FormField
            label="Leave range"
            hint="Grey dates are disabled because you already submitted leave for those days."
            :error="fieldErrors.startDate || fieldErrors.endDate"
            required
          >
            <DateRangeCalendar v-model="selectedRange" :disabled-dates="blockedDates" />
          </FormField>

          <div class="range-summary-panel range-summary-panel--split">
            <div>
              <p class="range-summary-panel__label">Selected period</p>
              <p class="range-summary-panel__value">{{ rangeSummary }}</p>
            </div>
            <div>
              <p class="range-summary-panel__label">Unavailable dates</p>
              <p class="range-summary-panel__value">{{ blockedDates.length }} blocked day{{ blockedDates.length === 1 ? '' : 's' }}</p>
            </div>
          </div>

          <AppAlert
            v-if="selectedRangeConflict && !fieldErrors.endDate"
            tone="info"
            title="Range already used"
            message="Your selected leave period includes a day that is already part of another leave request."
          />

          <FormInput
            v-model="form.reason"
            as="textarea"
            label="Reason"
            name="reason"
            hint="A concise explanation helps admins review faster."
            placeholder="Example: Medical appointment with follow-up."
            :rows="6"
            :error="fieldErrors.reason"
            required
          />

          <div class="field-meta field-meta--between">
            <span>Keep the reason specific and brief.</span>
            <span>{{ reasonCount }}/300 characters</span>
          </div>

          <div class="form-actions">
            <AppButton type="submit" :loading="loading" :disabled="selectedRangeConflict">
              {{ loading ? 'Submitting...' : 'Submit leave request' }}
            </AppButton>
            <AppButton type="button" variant="secondary" @click="router.push({ name: 'dashboard' })">
              Back to dashboard
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard variant="soft" class="request-sidebar">
        <p class="eyebrow">Before you submit</p>
        <h3 class="section-title">Quick approval checklist</h3>

        <ul class="checklist">
          <li>Pick a start date first, then extend the range only when you need multiple days.</li>
          <li>Greyed-out dates are already used by your own leave requests.</li>
          <li>The backend checks overlap again even if the frontend already blocked the range.</li>
          <li>Use the dashboard to review, cancel, or delete any request you no longer need.</li>
        </ul>
      </AppCard>
    </div>
  </section>
</template>
