<template>
  <div class="music-library-view">
    <div class="library-header">
      <button class="back-link" @click="$router.push('/slowdowner')">
        ← Back to app
      </button>
      <h1>Music Library</h1>
      <p class="library-description">Your uploaded audio files. Upload, rename, delete, or use in Slow Downer / Analyzer.</p>
      <div class="header-actions">
        <input
          ref="fileInputRef"
          type="file"
          accept="audio/*"
          style="display: none"
          @change="handleFileSelect"
        />
        <button class="btn-upload" @click="fileInputRef?.click()" :disabled="uploading">
          {{ uploading ? 'Uploading...' : '+ Upload File' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <p>Loading files...</p>
    </div>
    <div v-else-if="files.length === 0" class="empty-state">
      <p>No audio files yet. Upload your first file to get started!</p>
      <button class="btn-upload-empty" @click="fileInputRef?.click()" :disabled="uploading">
        {{ uploading ? 'Uploading...' : 'Upload File' }}
      </button>
    </div>
    <div v-else class="files-grid">
      <div v-for="fileItem in files" :key="fileItem.id" class="file-card">
        <div class="file-card-header">
          <input
            v-if="editingId === fileItem.id"
            ref="nameInputRef"
            v-model="editName"
            class="file-name-edit"
            @blur="saveName(fileItem.id)"
            @keydown.enter="saveName(fileItem.id)"
            @keydown.esc="cancelEdit"
          />
          <h3 v-else class="file-name" @click="startEdit(fileItem)">{{ fileItem.name }}</h3>
          <div class="file-card-actions">
            <button
              class="btn-action btn-use"
              @click="useFile(fileItem)"
              :disabled="loadingFileId === fileItem.id"
              title="Use in Slow Downer / Analyzer"
            >
              {{ loadingFileId === fileItem.id ? 'Loading...' : 'Use' }}
            </button>
            <button
              class="btn-action btn-delete"
              @click.stop="deleteFile(fileItem.id)"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
        <div class="file-card-meta">
          <span>{{ formatSize(fileItem.size) }}</span>
          <span v-if="fileItem.contentType">{{ fileItem.contentType.split('/')[1]?.toUpperCase() || 'Audio' }}</span>
        </div>
        <div v-if="fileItem.createdAt" class="file-card-date">
          {{ formatDate(fileItem.createdAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useAudioFiles } from '../composables/useAudioFiles'

const emit = defineEmits(['file-selected'])

const { isAuthenticated } = useAuth()
const { files, loading, uploadFile, updateFileName, deleteFile: deleteFileFromStore, getDownloadUrl } = useAudioFiles()

const fileInputRef = ref(null)
const nameInputRef = ref(null)
const editingId = ref(null)
const editName = ref('')
const uploading = ref(false)
const loadingFileId = ref(null)

const formatSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  try {
    let date
    if (timestamp.toDate) date = timestamp.toDate()
    else if (timestamp.toMillis) date = new Date(timestamp.toMillis())
    else if (timestamp instanceof Date) date = timestamp
    else date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

const startEdit = (item) => {
  editingId.value = item.id
  editName.value = item.name || ''
  nextTick(() => {
    const el = Array.isArray(nameInputRef.value) ? nameInputRef.value[0] : nameInputRef.value
    el?.focus()
  })
}

const cancelEdit = () => {
  editingId.value = null
  editName.value = ''
}

const saveName = async (fileId) => {
  const trimmed = editName.value?.trim() ?? ''
  editingId.value = null
  editName.value = ''
  if (!trimmed) return
  const item = files.value.find((f) => f.id === fileId)
  if (!item || item.name === trimmed) return
  try {
    await updateFileName(fileId, trimmed)
  } catch (e) {
    alert('Failed to rename: ' + (e.message || 'Unknown error'))
  }
}

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !file.type.startsWith('audio/')) {
    alert('Please select a valid audio file.')
    return
  }
  if (!isAuthenticated()) {
    alert('Please sign in to upload files.')
    return
  }
  uploading.value = true
  try {
    await uploadFile(file)
  } catch (e) {
    alert('Upload failed: ' + (e.message || 'Unknown error'))
  } finally {
    uploading.value = false
  }
}

const useFile = async (fileItem) => {
  const url = getDownloadUrl(fileItem)
  if (!url) {
    alert('Could not get file URL.')
    return
  }
  loadingFileId.value = fileItem.id
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const file = new File([blob], fileItem.name || 'audio', { type: blob.type || 'audio/mpeg' })
    emit('file-selected', file)
  } catch (e) {
    alert('Failed to load file: ' + (e.message || 'Unknown error'))
  } finally {
    loadingFileId.value = null
  }
}

const deleteFile = async (fileId) => {
  if (!window.confirm('Are you sure you want to delete this file?')) return
  try {
    await deleteFileFromStore(fileId)
  } catch (e) {
    alert('Delete failed: ' + (e.message || 'Unknown error'))
  }
}

watch(
  () => isAuthenticated(),
  (auth) => {
    if (auth) return
    editingId.value = null
    editName.value = ''
  },
  { immediate: true }
)
</script>

<style scoped>
.music-library-view {
  padding: 20px 0;
}

.library-header {
  margin-bottom: 28px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  margin-bottom: 16px;
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

.library-header h1 {
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  color: #2d3748;
}

.library-description {
  color: #718096;
  margin: 0 0 20px 0;
  font-size: 0.95rem;
}

.header-actions {
  margin-top: 16px;
}

.btn-upload {
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

.btn-upload:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.file-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.file-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.file-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.file-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2d3748;
  flex: 1;
  cursor: pointer;
  line-height: 1.3;
  word-break: break-word;
}

.file-name:hover {
  color: #667eea;
}

.file-name-edit {
  flex: 1;
  padding: 6px 10px;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2d3748;
  outline: none;
}

.file-card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn-action {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-use {
  background: #eef2ff;
  color: #667eea;
}

.btn-use:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

.btn-use:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-delete {
  background: transparent;
  font-size: 1rem;
  opacity: 0.6;
}

.btn-delete:hover {
  opacity: 1;
  background: #fff5f5;
}

.file-card-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #718096;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.file-card-date {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  font-size: 0.75rem;
  color: #a0aec0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
  font-size: 1.1rem;
}

.empty-state p {
  margin-bottom: 20px;
}

.btn-upload-empty {
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

.btn-upload-empty:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-upload-empty:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
