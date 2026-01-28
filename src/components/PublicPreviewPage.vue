<template>
  <div class="public-preview-page">
    <div v-if="loading" class="public-preview-loading">
      <div class="loading-spinner"></div>
      <p>Loading preview…</p>
    </div>
    <div v-else-if="error" class="public-preview-error">
      <p>{{ error }}</p>
      <router-link to="/" class="btn-home">Go to app</router-link>
    </div>
    <SongPerformanceView v-else-if="sharedSong" :public-preview="true" :shared-song="sharedSong" :preview-instrument="route.query.instrument || ''" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSharedSong } from '../composables/useSharedSongs'
import SongPerformanceView from './SongPerformanceView.vue'

const route = useRoute()
const loading = ref(true)
const error = ref(null)
const sharedSong = ref(null)

const loadShared = async (shareId) => {
  if (!shareId) {
    error.value = 'Invalid link'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  sharedSong.value = null
  const { success, song, error: err } = await getSharedSong(shareId)
  loading.value = false
  if (success && song) {
    sharedSong.value = song
  } else {
    error.value = err || 'Link not found or expired'
  }
}

onMounted(() => {
  loadShared(route.params.shareId)
})

watch(() => route.params.shareId, (shareId) => {
  loadShared(shareId)
})
</script>

<style scoped>
.public-preview-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.public-preview-loading,
.public-preview-error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.public-preview-error p {
  margin: 0;
  font-size: 1.1rem;
}

.btn-home {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-home:hover {
  background: rgba(255, 255, 255, 0.3);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
