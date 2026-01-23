<template>
  <div 
    class="track"
    :class="{ 'track-active': isActive }"
    @drop="handleDrop"
    @dragover.prevent="isActive = true"
    @dragleave="isActive = false"
  >
    <div class="track-header">
      <input 
        v-model="trackName" 
        class="track-name-input"
        @blur="handleNameChange"
        placeholder="Track name"
      />
      <div class="track-controls">
        <button 
          class="track-btn track-mute"
          :class="{ active: isMuted }"
          @click="toggleMute"
          :title="isMuted ? 'Unmute' : 'Mute'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="!isMuted" d="M11 5L6 9H2v6h4l5 4V5zM19 9l-6 6M13 9l6 6"/>
            <path v-else d="M11 5L6 9H2v6h4l5 4V5z"/>
          </svg>
        </button>
        <input
          type="range"
          class="track-volume"
          min="0"
          max="100"
          :value="volume"
          @input="handleVolumeChange"
          title="Volume"
        />
        <button 
          class="track-btn track-delete"
          @click="handleDelete"
          title="Delete track"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="track-content" ref="trackContentRef">
      <AudioBlock
        v-for="block in blocks"
        :key="block.fileId"
        :file="block.file"
        :fileId="block.fileId"
        :duration="block.duration"
        :startTime="block.startTime"
        :trackIndex="trackIndex"
        :pixelsPerSecond="pixelsPerSecond"
        :isPlaying="playingBlocks.has(block.fileId)"
        @drag-start="handleBlockDragStart"
        @drag-move="handleBlockDragMove"
        @drag-end="handleBlockDragEnd"
        @delete="handleBlockDelete"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AudioBlock from './AudioBlock.vue'

const props = defineProps({
  trackIndex: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  blocks: {
    type: Array,
    default: () => []
  },
  pixelsPerSecond: {
    type: Number,
    default: 50
  },
  playingBlocks: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['drop-block', 'update-name', 'delete', 'block-drag-start', 'block-drag-move', 'block-drag-end', 'block-delete', 'volume-change', 'mute-toggle'])

const trackContentRef = ref(null)
const isActive = ref(false)
const trackName = ref(props.name || `Track ${props.trackIndex + 1}`)
const volume = ref(100)
const isMuted = ref(false)

watch(() => props.name, (newName) => {
  if (newName) {
    trackName.value = newName
  }
})

const handleDrop = (event) => {
  isActive.value = false
  const data = event.dataTransfer.getData('application/json')
  if (data) {
    try {
      const blockData = JSON.parse(data)
      emit('drop-block', {
        ...blockData,
        trackIndex: props.trackIndex
      })
    } catch (e) {
      console.error('Error parsing drop data:', e)
    }
  }
}

const handleNameChange = () => {
  emit('update-name', {
    trackIndex: props.trackIndex,
    name: trackName.value
  })
}

const handleDelete = () => {
  if (confirm(`Delete track "${trackName.value}"?`)) {
    emit('delete', props.trackIndex)
  }
}

const handleBlockDragStart = (data) => {
  emit('block-drag-start', data)
}

const handleBlockDragMove = (data) => {
  emit('block-drag-move', data)
}

const handleBlockDragEnd = (data) => {
  emit('block-drag-end', data)
}

const handleBlockDelete = (fileId) => {
  emit('block-delete', {
    trackIndex: props.trackIndex,
    fileId
  })
}

const handleVolumeChange = (event) => {
  volume.value = Number(event.target.value)
  emit('volume-change', {
    trackIndex: props.trackIndex,
    volume: volume.value / 100
  })
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  emit('mute-toggle', {
    trackIndex: props.trackIndex,
    isMuted: isMuted.value
  })
}
</script>

<style scoped>
.track {
  border-bottom: 2px solid #e0e0e0;
  background: #fafafa;
  transition: background 0.2s ease;
}

.track.track-active {
  background: #f0f2ff;
}

.track-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.track-name-input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.95em;
  font-weight: 600;
  color: #333;
  min-width: 0;
}

.track-name-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.track-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.track-btn {
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.track-btn:hover {
  background: #f0f2ff;
  border-color: #667eea;
  color: #667eea;
}

.track-btn.active {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: white;
}

.track-btn svg {
  width: 18px;
  height: 18px;
}

.track-volume {
  width: 100px;
  height: 6px;
  cursor: pointer;
}

.track-content {
  position: relative;
  height: 80px;
  overflow-x: auto;
  overflow-y: hidden;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 49px,
    #e0e0e0 49px,
    #e0e0e0 50px
  );
}

.track-content::-webkit-scrollbar {
  height: 8px;
}

.track-content::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.track-content::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 4px;
}

.track-content::-webkit-scrollbar-thumb:hover {
  background: #5568d3;
}
</style>
