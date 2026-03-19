import { reactive } from 'vue';

export const toastState = reactive({
  items: []
});

function removeToast(id) {
  const index = toastState.items.findIndex((item) => item.id === id);

  if (index >= 0) {
    toastState.items.splice(index, 1);
  }
}

export function showToast({ title = '', message = '', tone = 'info', duration = 3600 }) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item = { id, title, message, tone };
  toastState.items.push(item);

  if (duration > 0) {
    window.setTimeout(() => removeToast(id), duration);
  }

  return id;
}

export function dismissToast(id) {
  removeToast(id);
}

export function notifySuccess(message, title = 'Success') {
  showToast({ tone: 'success', title, message });
}

export function notifyError(message, title = 'Something went wrong') {
  showToast({ tone: 'error', title, message, duration: 5000 });
}
