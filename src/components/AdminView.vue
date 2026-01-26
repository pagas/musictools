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
                  :disabled="savingUserId === user.uid"
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
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="4" class="empty-state">
                No users found. Users will appear here once they sign up.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="admin-actions">
        <button @click="loadUsers" class="btn-refresh" :disabled="loading">
          🔄 Refresh
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchUsers, usersList, loadingUsers, updateUserRole } = useAdmin()

const loading = ref(false)
const error = ref(null)
const editingUserId = ref(null)
const editingRole = ref('user')
const savingUserId = ref(null)

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

.admin-actions {
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
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
