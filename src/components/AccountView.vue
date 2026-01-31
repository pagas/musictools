<template>
  <div class="account-view">
    <div class="account-card">
      <button class="back-link" @click="$router.push('/slowdowner')">
        ← Back to app
      </button>
      <h2>Account Details</h2>
      <p class="account-description">Manage your account information</p>

      <form @submit.prevent="handleSave" class="account-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            :value="user?.email"
            type="email"
            disabled
            class="form-input form-input-disabled"
          />
          <p class="form-hint">Email cannot be changed</p>
        </div>

        <div class="form-group">
          <label for="displayName">Display Name</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="Enter your name"
            :disabled="saving"
            class="form-input"
          />
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn-save"
            :disabled="saving || !hasChanges"
          >
            <span v-if="!saving">Save Changes</span>
            <span v-else>Saving...</span>
          </button>
          <button
            type="button"
            class="btn-cancel"
            :disabled="saving"
            @click="resetForm"
          >
            Cancel
          </button>
        </div>
      </form>

      <p v-if="error" class="error-message">{{ error }}</p>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, updateUserProfile } = useAuth()
const displayName = ref('')
const saving = ref(false)
const error = ref(null)
const successMessage = ref(null)

const hasChanges = computed(() => {
  const current = user.value?.displayName || ''
  return displayName.value.trim() !== current
})

const resetForm = () => {
  displayName.value = user.value?.displayName || ''
  error.value = null
  successMessage.value = null
}

watch(user, (newUser) => {
  if (newUser) {
    displayName.value = newUser.displayName || ''
  }
}, { immediate: true })

const handleSave = async () => {
  error.value = null
  successMessage.value = null
  saving.value = true

  const result = await updateUserProfile({
    displayName: displayName.value.trim() || null
  })

  saving.value = false

  if (result.success) {
    successMessage.value = 'Account updated successfully'
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    error.value = result.error || 'Failed to update account'
  }
}
</script>

<style scoped>
.account-view {
  padding: 20px 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 0;
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.back-link:hover {
  color: #764ba2;
  text-decoration: underline;
}

.account-card {
  max-width: 480px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}

.account-card h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: #2d3748;
}

.account-description {
  color: #718096;
  margin: 0 0 28px 0;
  font-size: 0.95rem;
}

.account-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #4a5568;
  font-weight: 600;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  color: #2d3748;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input-disabled {
  background: #f7fafc;
  color: #718096;
  cursor: not-allowed;
}

.form-hint {
  margin: 6px 0 0 0;
  font-size: 0.8rem;
  color: #a0aec0;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}

.btn-save {
  flex: 1;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-cancel {
  padding: 12px 24px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
  border-color: #cbd5e0;
  background: #f7fafc;
}

.btn-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: #fff5f5;
  border: 1px solid #fc8181;
  border-radius: 8px;
  color: #c53030;
  font-size: 0.9rem;
  margin: 0;
}

.success-message {
  padding: 12px;
  background: #f0fff4;
  border: 1px solid #68d391;
  border-radius: 8px;
  color: #276749;
  font-size: 0.9rem;
  margin: 0;
}
</style>
