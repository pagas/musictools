<template>
  <div class="admin-view">
    <div class="admin-header">
      <h1>👤 User Administration</h1>
      <p class="admin-subtitle">Manage users and their roles</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading users...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="loadUsers" class="btn-retry">Retry</button>
    </div>

    <div v-else class="admin-content">
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Display Name</th>
              <th>Role</th>
              <th>Actions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.uid" class="user-row">
              <td>{{ user.email || user.uid }}</td>
              <td>{{ user.displayName || '-' }}</td>
              <td>
                <select 
                  v-if="editingUserId === user.uid"
                  v-model="editingRole"
                  class="role-select"
                  @change="saveUserRole(user.uid)"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <span v-else class="role-badge" :class="`role-${user.role || 'user'}`">
                  {{ (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1) }}
                </span>
              </td>
              <td>
                <button 
                  v-if="editingUserId !== user.uid"
                  @click="startEdit(user.uid, user.role || 'user')"
                  class="btn-edit"
                  :disabled="savingUserId === user.uid || deletingUserId === user.uid"
                >
                  ✏️ Edit
                </button>
                <button 
                  v-else
                  @click="cancelEdit"
                  class="btn-cancel"
                >
                  Cancel
                </button>
              </td>
              <td>
                <button 
                  @click="confirmDelete(user.uid, user.email)"
                  class="btn-delete"
                  :disabled="editingUserId === user.uid || savingUserId === user.uid || deletingUserId === user.uid"
                  title="Delete user"
                >
                  🗑️
                </button>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="5" class="empty-state">
                No users found. Users will appear here once they sign up.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="admin-actions">
        <button @click="showCreateForm = true" class="btn-create" :disabled="loading">
          ➕ Create User
        </button>
        <button @click="loadUsers" class="btn-refresh" :disabled="loading">
          🔄 Refresh
        </button>
      </div>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click.self="closeCreateForm">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New User</h2>
          <button @click="closeCreateForm" class="modal-close">✕</button>
        </div>
        <form @submit.prevent="handleCreateUser" class="create-user-form">
          <div class="form-group">
            <label for="new-email">Email *</label>
            <input
              id="new-email"
              v-model="newUser.email"
              type="email"
              placeholder="user@example.com"
              required
              class="form-input"
              :disabled="creatingUser"
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label for="new-password">Password *</label>
            <input
              id="new-password"
              v-model="newUser.password"
              type="password"
              placeholder="Enter password"
              required
              minlength="6"
              class="form-input"
              :disabled="creatingUser"
              autocomplete="new-password"
            />
          </div>
          <div class="form-group">
            <label for="new-display-name">Display Name</label>
            <input
              id="new-display-name"
              v-model="newUser.displayName"
              type="text"
              placeholder="Optional display name"
              class="form-input"
              :disabled="creatingUser"
            />
          </div>
          <div class="form-group">
            <label for="new-role">Role *</label>
            <select
              id="new-role"
              v-model="newUser.role"
              class="form-input"
              required
              :disabled="creatingUser"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div v-if="createError" class="error-message">{{ createError }}</div>
          <div class="form-actions">
            <button type="button" @click="closeCreateForm" class="btn-cancel-form" :disabled="creatingUser">
              Cancel
            </button>
            <button type="submit" class="btn-submit-form" :disabled="creatingUser || !newUser.email || !newUser.password">
              <span v-if="!creatingUser">Create User</span>
              <span v-else>Creating...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchUsers, usersList, loadingUsers, updateUserRole, deleteUser, createUser } = useAdmin()

const loading = ref(false)
const error = ref(null)
const editingUserId = ref(null)
const editingRole = ref('user')
const savingUserId = ref(null)
const deletingUserId = ref(null)
const showCreateForm = ref(false)
const creatingUser = ref(false)
const createError = ref(null)
const newUser = ref({
  email: '',
  password: '',
  displayName: '',
  role: 'user'
})

const users = computed(() => usersList.value)

const loadUsers = async () => {
  loading.value = true
  error.value = null
  const result = await fetchUsers()
  if (!result.success) {
    error.value = result.error || 'Failed to load users'
  }
  loading.value = false
}

const startEdit = (userId, currentRole) => {
  editingUserId.value = userId
  editingRole.value = currentRole
}

const cancelEdit = () => {
  editingUserId.value = null
  editingRole.value = 'user'
}

const saveUserRole = async (userId) => {
  savingUserId.value = userId
  const result = await updateUserRole(userId, editingRole.value)
  
  if (result.success) {
    editingUserId.value = null
    editingRole.value = 'user'
  } else {
    error.value = result.error || 'Failed to update user role'
  }
  savingUserId.value = null
}

const confirmDelete = (userId, userEmail) => {
  if (window.confirm(`Are you sure you want to delete user "${userEmail || userId}"?\n\nThis will remove the user from the database. This action cannot be undone.`)) {
    handleDelete(userId)
  }
}

const handleDelete = async (userId) => {
  deletingUserId.value = userId
  error.value = null
  
  const result = await deleteUser(userId)
  
  if (!result.success) {
    error.value = result.error || 'Failed to delete user'
  }
  
  deletingUserId.value = null
}

const closeCreateForm = () => {
  showCreateForm.value = false
  createError.value = null
  newUser.value = {
    email: '',
    password: '',
    displayName: '',
    role: 'user'
  }
}

const handleCreateUser = async () => {
  creatingUser.value = true
  createError.value = null
  
  const result = await createUser(
    newUser.value.email,
    newUser.value.password,
    newUser.value.displayName,
    newUser.value.role
  )
  
  if (result.success) {
    closeCreateForm()
    // Show message if admin needs to re-authenticate
    if (result.requiresReauth && result.message) {
      alert(result.message)
    }
  } else {
    createError.value = result.error || 'Failed to create user'
  }
  
  creatingUser.value = false
}

onMounted(() => {
  loadUsers()
})
</script>


<style scoped>
.admin-view {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.admin-header {
  margin-bottom: 30px;
}

.admin-header h1 {
  font-size: 2rem;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.admin-subtitle {
  color: #718096;
  margin: 0;
  font-size: 1rem;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #c53030;
  margin-bottom: 20px;
  font-size: 1rem;
}

.btn-retry {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-retry:hover {
  background: #764ba2;
}

.admin-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.users-table-container {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table thead {
  background: #f7fafc;
  border-bottom: 2px solid #e2e8f0;
}

.users-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.users-table td {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #2d3748;
}

.user-row:hover {
  background: #f7fafc;
}

.empty-state {
  text-align: center;
  color: #718096;
  padding: 40px;
}

.role-select {
  padding: 6px 12px;
  border: 2px solid #667eea;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  color: #2d3748;
  cursor: pointer;
  font-weight: 500;
}

.role-select:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
}

.role-user {
  background: #e2e8f0;
  color: #4a5568;
}

.role-admin {
  background: #fed7d7;
  color: #c53030;
}

.pending-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #fff3cd;
  color: #856404;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-edit,
.btn-cancel {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-edit:hover:not(:disabled) {
  background: #764ba2;
}

.btn-edit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: #718096;
}

.btn-cancel:hover {
  background: #4a5568;
}

.btn-delete {
  background: #e53e3e;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-delete:hover:not(:disabled) {
  background: #c53030;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-actions {
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.btn-refresh {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #764ba2;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-create {
  background: #48bb78;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-create:hover:not(:disabled) {
  background: #38a169;
}

.btn-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #2d3748;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #718096;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f7fafc;
  color: #2d3748;
}

.create-user-form {
  padding: 20px;
}

.create-user-form .form-group {
  margin-bottom: 20px;
}

.create-user-form label {
  display: block;
  margin-bottom: 8px;
  color: #4a5568;
  font-weight: 600;
  font-size: 0.9rem;
}

.create-user-form .form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  color: #2d3748;
  transition: all 0.2s;
  box-sizing: border-box;
}

.create-user-form .form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.create-user-form .form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f7fafc;
}

.create-user-form .error-message {
  margin-bottom: 16px;
  padding: 12px;
  background: #fff5f5;
  border: 1px solid #fc8181;
  border-radius: 8px;
  color: #c53030;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel-form {
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-cancel-form:hover:not(:disabled) {
  background: #cbd5e0;
}

.btn-cancel-form:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-submit-form {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-submit-form:hover:not(:disabled) {
  background: #764ba2;
}

.btn-submit-form:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .admin-view {
    padding: 20px;
  }

  .users-table {
    font-size: 0.85rem;
  }

  .users-table th,
  .users-table td {
    padding: 12px 8px;
  }
}
</style>
