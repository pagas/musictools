<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-header">
        <h1>🎵 Music Tools</h1>
        <p class="subtitle">Sign in to access premium features</p>
      </div>

      <div class="login-content">
        <div class="login-card">
          <h2>{{ isSignUp ? 'Create Account' : 'Welcome Back' }}</h2>
          <p class="login-description">
            {{ isSignUp ? 'Create an account to access:' : 'Sign in with your email to access:' }}
          </p>
          <ul class="features-list">
            <li>📜 Performance View</li>
            <li>🎛️ Multi-Track Editor</li>
          </ul>

          <form @submit.prevent="handleSubmit" class="login-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="your.email@example.com"
                required
                :disabled="loading"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="Enter your password"
                required
                :disabled="loading"
                class="form-input"
                minlength="6"
              />
            </div>

            <button 
              type="submit"
              class="btn-submit" 
              :disabled="loading || !email || !password"
            >
              <span v-if="!loading">{{ isSignUp ? 'Create Account' : 'Sign In' }}</span>
              <span v-else>{{ isSignUp ? 'Creating Account...' : 'Signing in...' }}</span>
            </button>
          </form>

          <div class="toggle-mode">
            <p>
              {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
              <button 
                type="button"
                class="btn-link" 
                @click="isSignUp = !isSignUp"
                :disabled="loading"
              >
                {{ isSignUp ? 'Sign In' : 'Sign Up' }}
              </button>
            </p>
          </div>

          <p v-if="error" class="error-message">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { signInWithEmail, signUpWithEmail, loading: authLoading } = useAuth()
const loading = ref(false)
const error = ref(null)
const email = ref('')
const password = ref('')
const isSignUp = ref(false)

const handleSubmit = async () => {
  error.value = null
  loading.value = true
  
  const result = isSignUp.value 
    ? await signUpWithEmail(email.value, password.value)
    : await signInWithEmail(email.value, password.value)
  
  if (!result.success) {
    error.value = result.error || 'Failed to sign in. Please try again.'
  }
  
  loading.value = false
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 500px;
}

.login-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 2.5rem;
  margin: 0 0 10px 0;
  font-weight: 700;
}

.login-header .subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  margin: 0;
}

.login-content {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-card h2 {
  margin: 0 0 16px 0;
  font-size: 1.8rem;
  color: #2d3748;
  text-align: center;
}

.login-description {
  color: #718096;
  margin-bottom: 24px;
  text-align: center;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
  text-align: center;
}

.features-list li {
  padding: 8px 0;
  color: #4a5568;
  font-size: 1rem;
}

.login-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
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

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f7fafc;
}

.btn-submit {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.toggle-mode {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.toggle-mode p {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
  text-decoration: underline;
  font-size: inherit;
  transition: color 0.2s;
}

.btn-link:hover:not(:disabled) {
  color: #764ba2;
}

.btn-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #fff5f5;
  border: 1px solid #fc8181;
  border-radius: 8px;
  color: #c53030;
  text-align: center;
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .login-content {
    padding: 30px 20px;
  }

  .login-header h1 {
    font-size: 2rem;
  }
}
</style>
