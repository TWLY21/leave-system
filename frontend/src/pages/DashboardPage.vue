<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import AppAlert from '../components/ui/AppAlert.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppPagination from '../components/ui/AppPagination.vue';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import FormInput from '../components/ui/FormInput.vue';
import MetricCard from '../components/ui/MetricCard.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';
import TableSkeleton from '../components/ui/TableSkeleton.vue';
import api from '../services/api';
import { authState } from '../services/auth';
import { notifyError, notifySuccess } from '../services/toast';
import { countDateRangeDays, formatDisplayDate } from '../utils/dateRange';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const busyAction = ref({ id: null, type: '' });
const errorMessage = ref('');
const leaves = ref([]);
const isAdmin = computed(() => authState.user?.role === 'admin');
const currentPage = ref(1);
const pageSize = 6;
const filters = reactive({
  status: 'all',
  sort: 'newest'
});
const confirmDialog = reactive({
  open: false,
  leaveId: null,
  message: ''
});
const filterOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' }
];
const sortOptions = [
  { label: 'Newest first', value: 'newest' },
  { label: 'Oldest first', value: 'oldest' }
];

const metrics = computed(() => {
  const total = leaves.value.length;
  const pending = leaves.value.filter((leave) => leave.status === 'pending').length;
  const approved = leaves.value.filter((leave) => leave.status === 'approved').length;
  const closed = leaves.value.filter((leave) => ['rejected', 'cancelled'].includes(leave.status)).length;

  return [
    { label: 'Total requests', value: total, tone: 'neutral' },
    { label: 'Pending review', value: pending, tone: 'warning' },
    { label: 'Approved', value: approved, tone: 'success' },
    { label: 'Closed', value: closed, tone: 'danger' }
  ];
});

function getStartDate(leave) {
  return leave.startDate || leave.date;
}

function getEndDate(leave) {
  return leave.endDate || leave.date;
}

function formatLeavePeriod(leave) {
  const startDate = getStartDate(leave);
  const endDate = getEndDate(leave);

  return startDate === endDate
    ? formatDisplayDate(startDate)
    : `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}

function getLeaveDurationLabel(leave) {
  const totalDays = countDateRangeDays(getStartDate(leave), getEndDate(leave));
  return `${totalDays} day${totalDays === 1 ? '' : 's'}`;
}

const filteredLeaves = computed(() => {
  const matchesStatus = filters.status === 'all'
    ? leaves.value
    : leaves.value.filter((leave) => leave.status === filters.status);

  return [...matchesStatus].sort((left, right) => {
    const leftDate = getStartDate(left);
    const rightDate = getStartDate(right);

    if (filters.sort === 'oldest') {
      return leftDate.localeCompare(rightDate);
    }

    return rightDate.localeCompare(leftDate);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLeaves.value.length / pageSize)));
const visibleLeaves = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize;
  return filteredLeaves.value.slice(startIndex, startIndex + pageSize);
});
const visibleRangeLabel = computed(() => {
  if (!filteredLeaves.value.length) {
    return 'No matching leave requests.';
  }

  const start = (currentPage.value - 1) * pageSize + 1;
  const end = Math.min(currentPage.value * pageSize, filteredLeaves.value.length);
  return `Showing ${start}-${end} of ${filteredLeaves.value.length} requests`;
});
const hasActiveFilters = computed(() => filters.status !== 'all' || filters.sort !== 'newest');

watch([() => filters.status, () => filters.sort], () => {
  currentPage.value = 1;
});

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value;
  }
});

async function loadLeaves() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const { data } = await api.get('/leaves');
    leaves.value = data.items;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to load leave requests.';
    notifyError(errorMessage.value, 'Dashboard unavailable');
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.status = 'all';
  filters.sort = 'newest';
}

function canCancel(leave) {
  return leave.status === 'pending' && leave.userId === authState.user?.id;
}

function canDelete(leave) {
  return leave.userId === authState.user?.id;
}

function isBusy(leaveId, actionType) {
  return busyAction.value.id === leaveId && busyAction.value.type === actionType;
}

async function cancelLeave(id) {
  errorMessage.value = '';
  busyAction.value = { id, type: 'cancel' };

  try {
    await api.put(`/leaves/${id}`);
    notifySuccess('Leave request cancelled.', 'Request updated');
    await loadLeaves();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to cancel leave request.';
    notifyError(errorMessage.value, 'Action failed');
  } finally {
    busyAction.value = { id: null, type: '' };
  }
}

function requestDelete(leave) {
  confirmDialog.open = true;
  confirmDialog.leaveId = leave.id;
  confirmDialog.message = `Delete the leave request for ${formatLeavePeriod(leave)}? This action cannot be undone.`;
}

function closeDeleteDialog() {
  confirmDialog.open = false;
  confirmDialog.leaveId = null;
  confirmDialog.message = '';
}

async function confirmDelete() {
  const id = confirmDialog.leaveId;

  if (!id) {
    return;
  }

  errorMessage.value = '';
  busyAction.value = { id, type: 'delete' };

  try {
    const { data } = await api.delete(`/leaves/${id}`);
    notifySuccess(data.message || 'Leave request deleted successfully.', 'Request removed');
    closeDeleteDialog();
    await loadLeaves();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to delete leave request.';
    notifyError(errorMessage.value, 'Action failed');
  } finally {
    busyAction.value = { id: null, type: '' };
  }
}

async function reviewLeave(id, decision) {
  errorMessage.value = '';
  busyAction.value = { id, type: decision };

  try {
    await api.put(`/leaves/${id}/${decision}`);
    notifySuccess(`Leave request ${decision}d.`, 'Review saved');
    await loadLeaves();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Unable to review leave request.';
    notifyError(errorMessage.value, 'Action failed');
  } finally {
    busyAction.value = { id: null, type: '' };
  }
}

onMounted(async () => {
  if (route.query.notice === 'created') {
    notifySuccess('Leave request submitted successfully.', 'Request created');
    const nextQuery = { ...route.query };
    delete nextQuery.notice;
    router.replace({ query: nextQuery });
  }

  await loadLeaves();
});
</script>

<template>
  <section class="page-stack">
    <div class="page-heading page-heading--dashboard">
      <div>
        <p class="eyebrow">Overview</p>
        <h2 class="page-title">Leave Dashboard</h2>
        <p class="page-copy">
          {{ isAdmin ? 'Review team requests, approve priorities, and keep a clear audit trail.' : 'Track your leave requests, filter the queue quickly, and manage anything still pending.' }}
        </p>
      </div>

      <div class="page-heading__actions">
        <RouterLink v-if="!isAdmin" class="app-button app-button--primary app-button--md" to="/apply">New Request</RouterLink>
        <AppButton variant="secondary" size="md" :loading="loading" @click="loadLeaves">
          Refresh
        </AppButton>
      </div>
    </div>

    <div class="metrics-grid metrics-grid--dashboard">
      <MetricCard v-for="metric in metrics" :key="metric.label" :label="metric.label" :value="metric.value" :tone="metric.tone" />
    </div>

    <AppAlert
      v-if="errorMessage"
      tone="error"
      title="Action failed"
      :message="errorMessage"
    />

    <AppCard class="dashboard-card">
      <div class="section-heading section-heading--spaced">
        <div>
          <h3 class="section-title">Leave requests</h3>
          <p class="page-copy">Filter, sort, and page through requests without leaving the dashboard.</p>
        </div>
        <p class="dashboard-meta">{{ visibleRangeLabel }}</p>
      </div>

      <div class="dashboard-toolbar">
        <div class="dashboard-toolbar__fields">
          <FormInput
            v-model="filters.status"
            as="select"
            label="Filter by status"
            name="status-filter"
            :options="filterOptions"
          />
          <FormInput
            v-model="filters.sort"
            as="select"
            label="Sort by start date"
            name="date-sort"
            :options="sortOptions"
          />
        </div>

        <AppButton variant="ghost" size="sm" :disabled="!hasActiveFilters" @click="resetFilters">
          Reset filters
        </AppButton>
      </div>

      <div v-if="loading" class="loading-panel">
        <TableSkeleton :rows="6" :columns="6" />
      </div>

      <EmptyState
        v-else-if="!leaves.length"
        title="No leave requests yet"
        description="Once a leave request is submitted, it will appear here for tracking and review."
      >
        <RouterLink v-if="!isAdmin" class="app-button app-button--primary app-button--md" to="/apply">
          Create first request
        </RouterLink>
      </EmptyState>

      <EmptyState
        v-else-if="!filteredLeaves.length"
        title="No requests match these filters"
        description="Try a different status or sort option to bring matching leave requests back into view."
      >
        <AppButton variant="secondary" size="md" @click="resetFilters">
          Clear filters
        </AppButton>
      </EmptyState>

      <div v-else class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Leave period</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Reviewed by</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="leave in visibleLeaves" :key="leave.id">
              <td>
                <div class="table-user">
                  <span class="table-user__avatar">{{ leave.username.slice(0, 1).toUpperCase() }}</span>
                  <div>
                    <span class="table-user__name">{{ leave.username }}</span>
                    <span class="table-user__role">{{ leave.userId === authState.user?.id ? 'You' : 'Employee' }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="table-date-block">
                  <span class="table-date-block__range">{{ formatLeavePeriod(leave) }}</span>
                  <span class="table-date-block__meta">{{ getLeaveDurationLabel(leave) }}</span>
                </div>
              </td>
              <td class="table-reason">{{ leave.reason }}</td>
              <td><StatusBadge :value="leave.status" /></td>
              <td>{{ leave.reviewerUsername || 'Not reviewed yet' }}</td>
              <td>
                <div class="table-actions">
                  <AppButton
                    v-if="canCancel(leave)"
                    class="table-actions__button"
                    variant="ghost"
                    size="sm"
                    :loading="isBusy(leave.id, 'cancel')"
                    :disabled="busyAction.id === leave.id && busyAction.type !== 'cancel'"
                    @click="cancelLeave(leave.id)"
                  >
                    Cancel
                  </AppButton>

                  <AppButton
                    v-if="canDelete(leave)"
                    class="table-actions__button"
                    variant="danger"
                    size="sm"
                    :loading="isBusy(leave.id, 'delete')"
                    :disabled="busyAction.id === leave.id && busyAction.type !== 'delete'"
                    @click="requestDelete(leave)"
                  >
                    Delete
                  </AppButton>

                  <AppButton
                    v-if="isAdmin && leave.status === 'pending'"
                    class="table-actions__button"
                    variant="primary"
                    size="sm"
                    :loading="isBusy(leave.id, 'approve')"
                    :disabled="busyAction.id === leave.id && busyAction.type !== 'approve'"
                    @click="reviewLeave(leave.id, 'approve')"
                  >
                    Approve
                  </AppButton>

                  <AppButton
                    v-if="isAdmin && leave.status === 'pending'"
                    class="table-actions__button"
                    variant="danger"
                    size="sm"
                    :loading="isBusy(leave.id, 'reject')"
                    :disabled="busyAction.id === leave.id && busyAction.type !== 'reject'"
                    @click="reviewLeave(leave.id, 'reject')"
                  >
                    Reject
                  </AppButton>

                  <span v-if="!canDelete(leave) && !(isAdmin && leave.status === 'pending')" class="table-empty-action">
                    No action
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <AppPagination :current-page="currentPage" :total-pages="totalPages" @update:page="currentPage = $event" />
      </div>
    </AppCard>

    <ConfirmDialog
      :open="confirmDialog.open"
      title="Delete leave request"
      :message="confirmDialog.message"
      confirm-text="Delete request"
      :loading="busyAction.type === 'delete'"
      @cancel="closeDeleteDialog"
      @confirm="confirmDelete"
    />
  </section>
</template>
