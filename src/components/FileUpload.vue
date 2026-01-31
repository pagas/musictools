<template>
  <div class="upload-section">
    <div
      class="upload-area"
      :class="{ dragover: isDragging }"
      @click="triggerFileInput"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="audio/*"
        style="display: none"
        @change="handleFileSelect"
      />
      <div class="upload-content">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p class="upload-text">Click to upload or drag and drop</p>
        <p class="upload-hint">Supported formats: MP3, WAV, OGG, M4A</p>
      </div>
    </div>

    <div v-if="props.isAuthenticated" class="library-option">
      <button
        type="button"
        class="btn-library-toggle"
        @click="showLibraryPicker = !showLibraryPicker"
      >
        {{ showLibraryPicker ? '▼' : '▶' }} Use from Music Library
      </button>
      <div v-if="showLibraryPicker" class="library-picker">
        <div v-if="libraryLoading" class="library-loading">Loading...</div>
        <div v-else-if="libraryFiles.length === 0" class="library-empty">
          No files in your library yet. <a href="#" @click.prevent="goToLibrary">Go to Music Library</a> to upload.
        </div>
        <div v-else class="library-list">
          <button
            v-for="item in libraryFiles"
            :key="item.id"
            type="button"
            class="library-item-btn"
            :disabled="loadingFileId === item.id"
            @click="useFromLibrary(item)"
          >
            <span class="library-item-name">{{ item.name }}</span>
            <span class="library-item-meta">{{ formatSize(item.size) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAudioFiles } from '../composables/useAudioFiles'

const props = defineProps({
  isAuthenticated: { type: Boolean, default: false }
})

const emit = defineEmits(['file-selected'])

const router = useRouter()
const { files: libraryFiles, loading: libraryLoading, getDownloadUrl } = useAudioFiles()

const fileInput = ref(null)
const isDragging = ref(false)
const showLibraryPicker = ref(false)
const loadingFileId = ref(null)

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const goToLibrary = () => {
  router.push('/library')
}

const useFromLibrary = async (item) => {
  const url = getDownloadUrl(item)
  if (!url) {
    alert('Could not get file URL.')
    return
  }
  loadingFileId.value = item.id
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const file = new File([blob], item.name || 'audio', { type: blob.type || 'audio/mpeg' })
    emit('file-selected', file)
    showLibraryPicker.value = false
  } catch (e) {
    alert('Failed to load file: ' + (e.message || 'Unknown error'))
  } finally {
    loadingFileId.value = null
  }
}

watch(() => props.isAuthenticated, (auth) => {
  if (!auth) showLibraryPicker.value = false
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && file.type.startsWith('audio/')) {
    emit('file-selected', file)
  } else {
    alert('Please select a valid audio file.')
  }
  event.target.value = ''
}

const handleDrop = (event) => {
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files.length > 0 && files[0].type.startsWith('audio/')) {
    emit('file-selected', files[0])
  } else {
    alert('Please drop a valid audio file.')
  }
}
</script>

<style scoped>
.upload-section {
  margin-bottom: 40px;
}

.upload-area {
  border: 3px dashed #667eea;
  border-radius: 15px;
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9ff;
}

.upload-area:hover {
  background: #f0f2ff;
  border-color: #764ba2;
  transform: translateY(-2px);
}

.upload-area.dragover {
  background: #e8ebff;
  border-color: #764ba2;
  transform: scale(1.02);
}

.upload-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  color: #667eea;
}

.upload-text {
  font-size: 1.3em;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.upload-hint {
  color: #666;
  font-size: 0.9em;
}

.library-option {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.btn-library-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-library-toggle:hover {
  color: #764ba2;
}

.library-picker {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9ff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  max-height: 200px;
  overflow-y: auto;
}

.library-loading,
.library-empty {
  color: #718096;
  font-size: 0.9rem;
  text-align: center;
}

.library-empty a {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
}

.library-empty a:hover {
  text-decoration: underline;
}

.library-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.library-item-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.library-item-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f0f2ff;
}

.library-item-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.library-item-name {
  font-weight: 500;
  color: #2d3748;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-item-meta {
  font-size: 0.8rem;
  color: #718096;
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
