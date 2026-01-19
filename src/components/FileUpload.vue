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
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['file-selected'])
const fileInput = ref(null)
const isDragging = ref(false)

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
</style>
