<script setup>
import { computed, reactive, ref } from 'vue';
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
  password: '',
  confirmPassword: ''
});
const fieldErrors = reactive({
  username: '',
  password: '',
  confirmPassword: ''
});
const errorMessage = ref('');
const loading = ref(false);
const passwordChecklist = computed(() => ([
  { label: 'At least 8 characters', valid: form.password.length >= 8 },
  { label: 'One uppercase letter', valid: /[A-Z]/.test(form.password) },
  { label: 'One lowercase letter', valid: /[a-z]/.test(form.password) },
  { label: 'One number', valid: /\d/.test(form.password) },
  { label: 'One symbol', valid: /[^A-Za-z0-9]/.test(form.password) }
]));

function validateForm() {
  fieldErrors.username = form.username.trim().length >= 3 ? '' : 'Username must be at least 3 characters long.';
  fieldErrors.password = passwordChecklist.value.every((rule) => rule.valid)
    ? ''
    : 'Password must include uppercase, lowercase, number, symbol, and 8+ characters.';
  fieldErrors.confirmPassword = form.password === form.confirmPassword ? '' : 'Passwords do not match.';
  return !fieldErrors.username && !fieldErrors.password && !fieldErrors.confirmPassword;
}

async function submit() {
  errorMessage.value = '';

  if (!validateForm()) {
    notifyError('Please correct the highlighted registration fields.', 'Validation error');
    return;
  }

  loading.value = true;

  try {
    const { data } = await api.post('/auth/register', {
      username: form.username,
      password: form.password
    });
    setSession(data);
    notifySuccess(`Account created for ${data.user.username}.`, 'Registration successful');
    router.push({ name: 'dashboard' });
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Registration failed.';
    notifyError(errorMessage.value, 'Unable to register');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="auth-layout auth-layout--polished">
    <AppCard class="auth-layout__intro" variant="gradient">
      <p class="eyebrow">Employee onboarding</p>
      <h2 class="page-title">Create a user account and start submitting leave requests right away.</h2>
      <p class="page-copy">
        Registration creates a normal employee account. Admin permissions stay controlled on the backend, so the portfolio project still demonstrates role-based access cleanly.
      </p>

      <div class="auth-highlights">
        <div class="auth-highlight">
          <span class="auth-highlight__icon">01</span>
          <div>
            <h3>Stronger passwords</h3>
            <p class="page-copy">Registration now mirrors the backend password rules so weak passwords are rejected before submission.</p>
          </div>
        </div>

        <div class="auth-highlight">
          <span class="auth-highlight__icon">02</span>
          <div>
            <h3>Immediate access</h3>
            <p class="page-copy">Successful registration signs the user in and redirects them to the leave dashboard.</p>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard class="auth-layout__form auth-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">New account</p>
          <h2 class="page-title">Register</h2>
        </div>
        <p class="page-copy">Create a standard employee account. Admin role assignment remains backend-controlled.</p>
      </div>

      <AppAlert
        v-if="errorMessage"
        tone="error"
        title="Unable to register"
        :message="errorMessage"
      />

      <form class="form-stack" @submit.prevent="submit">
        <FormInput
          v-model="form.username"
          label="Username"
          name="username"
          autocomplete="username"
          placeholder="Choose a username"
          :error="fieldErrors.username"
          required
        />

        <FormInput
          v-model="form.password"
          label="Password"
          name="password"
          type="password"
          autocomplete="new-password"
          placeholder="Create a secure password"
          :error="fieldErrors.password"
          required
        />

        <ul class="password-checklist">
          <li v-for="rule in passwordChecklist" :key="rule.label" :class="{ 'is-valid': rule.valid }">
            {{ rule.label }}
          </li>
        </ul>

        <FormInput
          v-model="form.confirmPassword"
          label="Confirm password"
          name="confirm-password"
          type="password"
          autocomplete="new-password"
          placeholder="Re-enter the password"
          :error="fieldErrors.confirmPassword"
          required
        />

        <AppButton type="submit" :loading="loading" block>
          {{ loading ? 'Creating account...' : 'Create account' }}
        </AppButton>
      </form>

      <p class="auth-alt-link">
        Already have an account?
        <RouterLink to="/login">Sign in</RouterLink>
      </p>
    </AppCard>
  </section>
</template>
