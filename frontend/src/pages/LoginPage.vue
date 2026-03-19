<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppAlert from '../components/ui/AppAlert.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppCard from '../components/ui/AppCard.vue';
import FormInput from '../components/ui/FormInput.vue';
import api from '../services/api';
import { setSession } from '../services/auth';
import { notifyError, notifySuccess } from '../services/toast';

const router = useRouter();
const form = reactive({
  username: '',
  password: ''
});
const fieldErrors = reactive({
  username: '',
  password: ''
});
const errorMessage = ref('');
const loading = ref(false);

function validateForm() {
  fieldErrors.username = form.username.trim() ? '' : 'Username is required.';
  fieldErrors.password = form.password ? '' : 'Password is required.';
  return !fieldErrors.username && !fieldErrors.password;
}

async function submit() {
  errorMessage.value = '';

  if (!validateForm()) {
    notifyError('Please complete the required fields before signing in.', 'Validation error');
    return;
  }

  loading.value = true;

  try {
    const { data } = await api.post('/auth/login', form);
    setSession(data);
    notifySuccess(`Welcome back, ${data.user.username}.`, 'Sign-in successful');
    router.push({ name: 'dashboard' });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Login failed.';
    notifyError(errorMessage.value, 'Unable to sign in');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="auth-layout auth-layout--polished">
    <AppCard class="auth-layout__intro" variant="gradient">
      <p class="eyebrow">Operations portal</p>
      <h2 class="page-title">Manage leave requests with a clean, audit-friendly workflow.</h2>
      <p class="page-copy">
        Sign in to review pending requests, submit new leave applications, and keep approval decisions organized in one dashboard.
      </p>

      <div class="auth-highlights">
        <div class="auth-highlight">
          <span class="auth-highlight__icon">01</span>
          <div>
            <h3>Secure access</h3>
            <p class="page-copy">JWT-backed sessions protect employee and admin actions.</p>
          </div>
        </div>

        <div class="auth-highlight">
          <span class="auth-highlight__icon">02</span>
          <div>
            <h3>Operational clarity</h3>
            <p class="page-copy">Track pending, approved, rejected, and cancelled requests in one place.</p>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard class="auth-layout__form auth-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Secure access</p>
          <h2 class="page-title">Sign in</h2>
        </div>
        <p class="page-copy">Use `admin` / `Admin123!` or register a new employee account below.</p>
      </div>

      <AppAlert
        v-if="errorMessage"
        tone="error"
        title="Unable to sign in"
        :message="errorMessage"
      />

      <form class="form-stack" @submit.prevent="submit">
        <FormInput
          v-model="form.username"
          label="Username"
          name="username"
          autocomplete="username"
          placeholder="Enter your username"
          :error="fieldErrors.username"
          required
        />

        <FormInput
          v-model="form.password"
          label="Password"
          name="password"
          type="password"
          autocomplete="current-password"
          placeholder="Enter your password"
          :error="fieldErrors.password"
          required
        />

        <AppButton type="submit" :loading="loading" block>
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </AppButton>
      </form>

      <p class="auth-alt-link">
        Need a normal user account?
        <RouterLink to="/register">Create one here</RouterLink>
      </p>
    </AppCard>
  </section>
</template>
