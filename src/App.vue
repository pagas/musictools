<template>
  <!-- Show loading state -->
  <div v-if="loading" class="loading-container">
    <div class="loading-spinner"></div>
    <p>Loading...</p>
  </div>

  <!-- Public preview: /p/:shareId – no auth, full-screen preview -->
  <PublicPreviewPage v-else-if="route.name === 'publicPreview'" />

  <!-- Show login if not authenticated and trying to access protected tabs, or if showLoginView is true -->
  <LoginView v-else-if="(!isAuthenticated && activeTab !== 'slowdowner' && activeTab !== 'analyzer') || showLoginView" @open-tab="setActiveTab($event); showLoginView = false" />

  <!-- Main app (available for slowdowner/analyzer even without auth, or all tabs when authenticated) -->
  <div v-else class="container">
    <header>
      <div class="header-content">
        <div>
          <h1>🎵 Music Tools</h1>
          <p class="subtitle">Upload and analyze or slow down your music</p>
        </div>
        <div class="user-info">
          <div v-if="isAuthenticated" class="user-dropdown-wrapper" ref="userDropdownRef">
            <button
              class="user-dropdown-trigger"
              @click="userDropdownOpen = !userDropdownOpen"
              title="Account menu"
            >
              <img 
                v-if="user?.photoURL" 
                :src="user.photoURL" 
                :alt="user.displayName || 'User'"
                class="user-avatar"
              />
              <span class="user-name">
                {{ user?.displayName || user?.email }}
                <span v-if="isAdmin" class="admin-badge" title="Administrator">👑</span>
                <span class="dropdown-chevron">▼</span>
              </span>
            </button>
            <transition name="dropdown">
              <div v-if="userDropdownOpen" class="user-dropdown-menu">
                <button
                  class="dropdown-item"
                  @click="setActiveTab('library'); userDropdownOpen = false"
                >
                  🎵 Music Library
                </button>
                <button
                  class="dropdown-item"
                  @click="setActiveTab('account'); userDropdownOpen = false"
                >
                  ⚙️ Account
                </button>
                <button
                  class="dropdown-item dropdown-item-danger"
                  @click="handleLogout(); userDropdownOpen = false"
                >
                  Sign Out
                </button>
              </div>
            </transition>
          </div>
          <button v-else class="btn-login" @click="showLoginView = true" title="Sign in">
            Sign In
          </button>
        </div>
      </div>
    </header>

    <nav class="tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'slowdowner' }"
        @click="setActiveTab('slowdowner')"
      >
        🎚️ Slow Downer
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'analyzer' }"
        @click="setActiveTab('analyzer')"
      >
        🔍 Music Analyzer
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'multitrack' }"
        @click="setActiveTab('multitrack')"
        :disabled="!isAuthenticated"
        :title="!isAuthenticated ? 'Sign in required' : ''"
      >
        🎛️ Multi-Track Editor
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'performance' }"
        @click="setActiveTab('performance')"
        :disabled="!isAuthenticated"
        :title="!isAuthenticated ? 'Sign in required' : ''"
      >
        📜 Performance View
      </button>
      <button 
        v-if="isAdmin"
        class="tab-btn" 
        :class="{ active: activeTab === 'admin' }"
        @click="setActiveTab('admin')"
      >
        👤 Admin
      </button>
    </nav>

    <main>
      <FileUpload
        v-if="!currentFile && activeTab !== 'multitrack' && activeTab !== 'performance' && activeTab !== 'admin' && activeTab !== 'account' && activeTab !== 'library'"
        @file-selected="handleFileSelected"
      />
      
      <div v-if="currentFile && activeTab !== 'multitrack' && activeTab !== 'performance' && activeTab !== 'admin' && activeTab !== 'account' && activeTab !== 'library'" class="file-info">
        <p><strong>Current file:</strong> <span>{{ currentFile.name }}</span></p>
        <button class="btn-change" @click="changeFile">Change File</button>
      </div>

      <MusicPlayer
        v-if="currentFile && activeTab === 'slowdowner'"
        :file="currentFile"
      />

      <MusicAnalyzer
        v-if="currentFile && activeTab === 'analyzer'"
        :file="currentFile"
      />

      <MultiTrackEditor
        v-if="activeTab === 'multitrack' && isAuthenticated"
      />

      <SongPerformanceView
        v-if="activeTab === 'performance' && isAuthenticated"
      />

      <AdminView
        v-if="activeTab === 'admin' && isAuthenticated && isAdmin"
      />

      <AccountView
        v-if="activeTab === 'account' && isAuthenticated"
      />

      <MusicLibraryView
        v-if="activeTab === 'library' && isAuthenticated"
        @file-selected="handleLibraryFileSelected"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { useAdmin } from './composables/useAdmin'
import FileUpload from './components/FileUpload.vue'
import MusicPlayer from './components/MusicPlayer.vue'
import MusicAnalyzer from './components/MusicAnalyzer.vue'
import MultiTrackEditor from './components/MultiTrackEditor.vue'
import SongPerformanceView from './components/SongPerformanceView.vue'
import AdminView from './components/AdminView.vue'
import AccountView from './components/AccountView.vue'
import MusicLibraryView from './components/MusicLibraryView.vue'
import LoginView from './components/LoginView.vue'
import PublicPreviewPage from './components/PublicPreviewPage.vue'

const router = useRouter()
const route = useRoute()
const { user, loading, logout, isAuthenticated: checkAuth } = useAuth()
const { isAdmin, initializeUserRole } = useAdmin()

const currentFile = ref(null)
const activeTab = ref('slowdowner')
const showLoginView = ref(false)
const userDropdownOpen = ref(false)
const userDropdownRef = ref(null)

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (userDropdownRef.value && !userDropdownRef.value.contains(event.target)) {
    userDropdownOpen.value = false
  }
}

const isAuthenticated = computed(() => checkAuth())

// Map route names to tab names
const routeToTab = {
  'slowdowner': 'slowdowner',
  'analyzer': 'analyzer',
  'performance': 'performance',
  'multitrack': 'multitrack',
  'admin': 'admin',
  'account': 'account',
  'library': 'library'
}

// Sync activeTab with route
watch(() => route.name, (routeName) => {
  if (routeName && routeToTab[routeName]) {
    activeTab.value = routeToTab[routeName]
  }
}, { immediate: true })

// Update route when tab changes
const setActiveTab = (tab) => {
  if (tab === 'slowdowner') {
    router.push('/slowdowner')
  } else if (tab === 'analyzer') {
    router.push('/analyzer')
  } else if (tab === 'performance') {
    router.push('/performance')
  } else if (tab === 'multitrack') {
    router.push('/multitrack')
  } else if (tab === 'admin') {
    router.push('/admin')
  } else if (tab === 'account') {
    router.push('/account')
  } else if (tab === 'library') {
    router.push('/library')
  }
}

// Protect routes - redirect to slowdowner if trying to access protected tabs without auth
watch([isAuthenticated, activeTab], ([authenticated, tab]) => {
  if (!authenticated && (tab === 'multitrack' || tab === 'performance')) {
    setActiveTab('slowdowner')
  }
  // Hide login view when user successfully authenticates
  if (authenticated) {
    showLoginView.value = false
  }
})

// Handle route protection on mount and on route change
watch(() => route.meta, (meta) => {
  if (meta?.requiresAuth && !isAuthenticated.value) {
    router.push('/slowdowner')
  } else if (meta?.requiresAdmin && (!isAuthenticated.value || !isAdmin.value)) {
    router.push('/slowdowner')
  }
}, { immediate: true })

// Close dropdown when navigating
watch(activeTab, () => {
  userDropdownOpen.value = false
})

// Initialize user role when authenticated
watch(isAuthenticated, async (authenticated) => {
  if (authenticated && user.value) {
    await initializeUserRole()
  }
}, { immediate: true })

// Handle click outside for dropdown and route protection
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  
  if (route.meta?.requiresAuth && !isAuthenticated.value) {
    router.push('/slowdowner')
  } else if (route.meta?.requiresAdmin && (!isAuthenticated.value || !isAdmin.value)) {
    router.push('/slowdowner')
  }
  
  // Initialize user role if authenticated
  if (isAuthenticated.value && user.value) {
    await initializeUserRole()
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleFileSelected = (file) => {
  currentFile.value = file
}

const handleLibraryFileSelected = (file) => {
  currentFile.value = file
  setActiveTab('slowdowner')
}

const changeFile = () => {
  currentFile.value = null
}

const handleLogout = async () => {
  await logout()
  setActiveTab('slowdowner')
  currentFile.value = null
}
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  font-weight: 700;
}

.subtitle {
  opacity: 0.9;
  font-size: 1.1em;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-dropdown-wrapper {
  position: relative;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 6px 12px;
  border-radius: 10px;
  cursor: pointer;
  color: white;
  font: inherit;
  transition: all 0.2s ease;
}

.user-dropdown-trigger:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 100;
  border: 1px solid #e2e8f0;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  font-size: 0.95rem;
  color: #2d3748;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: #f7fafc;
}

.dropdown-item-danger {
  color: #e53e3e;
  border-top: 1px solid #e2e8f0;
}

.dropdown-item-danger:hover {
  background: #fff5f5;
}

.dropdown-chevron {
  font-size: 0.6rem;
  margin-left: 4px;
  opacity: 0.9;
  transition: transform 0.2s;
}

.user-dropdown-trigger:hover .dropdown-chevron {
  opacity: 1;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.user-dropdown-wrapper .user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.user-name {
  font-size: 0.95rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-badge {
  font-size: 0.85rem;
  opacity: 0.9;
}

.btn-logout,
.btn-login {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-logout:hover,
.btn-login:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.loading-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

main {
  padding: 40px;
  min-height: 400px;
}

.file-info {
  background: #f0f2ff;
  padding: 20px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.file-info p {
  margin: 0;
  color: #333;
}

.file-info span {
  color: #667eea;
  font-weight: 600;
}

.btn-change {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-change:hover {
  background: #764ba2;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.tabs {
  display: flex;
  gap: 10px;
  padding: 0 40px;
  border-bottom: 2px solid #e0e0e0;
  background: #f8f9ff;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 15px 30px;
  font-size: 1em;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  top: 2px;
}

.tab-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  position: relative;
}

.tab-btn:disabled::after {
  content: '🔒';
  margin-left: 6px;
  font-size: 0.8em;
}

.multitrack-wrapper {
  padding: 0;
  margin: -40px;
  min-height: 600px;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .container {
    border-radius: 0;
    margin: 0;
    max-width: 100%;
  }

  header {
    padding: 25px 20px;
  }

  .header-content {
    flex-direction: column;
    text-align: center;
  }

  .user-info {
    width: 100%;
    justify-content: center;
    margin-top: 20px;
  }

  header h1 {
    font-size: 2em;
  }

  .subtitle {
    font-size: 1em;
  }

  main {
    padding: 20px;
  }

  .file-info {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
    padding: 15px;
  }

  .file-info p {
    word-break: break-word;
  }

  .tabs {
    padding: 0 20px;
    flex-wrap: wrap;
  }

  .tab-btn {
    padding: 12px 20px;
    font-size: 0.9em;
  }
}

@media (max-width: 480px) {
  header {
    padding: 20px 15px;
  }

  header h1 {
    font-size: 1.5em;
  }

  .subtitle {
    font-size: 0.9em;
  }

  main {
    padding: 15px;
  }

  .file-info {
    padding: 12px;
  }

  .tabs {
    padding: 0 15px;
  }

  .tab-btn {
    padding: 10px 15px;
    font-size: 0.85em;
    flex: 1;
    min-width: 120px;
  }
}
</style>
