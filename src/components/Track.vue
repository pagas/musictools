<template>
  <div 
    class="track"
    ref="trackRef"
    :class="{ 'track-active': isActive }"
    @drop="handleDrop"
    @dragover.prevent="isActive = true"
    @dragleave="isActive = false"
  >
    <div class="track-wrapper" ref="trackWrapperRef">
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
          :color="block.color"
          @drag-start="handleBlockDragStart"
          @drag-move="handleBlockDragMove"
          @drag-end="handleBlockDragEnd"
          @delete="handleBlockDelete"
        />
      </div>
      <div class="track-header" ref="trackHeaderRef">
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
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
const trackRef = ref(null)
const trackWrapperRef = ref(null)
const trackHeaderRef = ref(null)
const isActive = ref(false)
const trackName = ref(props.name || `Track ${props.trackIndex + 1}`)
const volume = ref(100)
const isMuted = ref(false)

watch(() => props.name, (newName) => {
  if (newName) {
    trackName.value = newName
  }
})

// Position header relative to tracks-scroll-wrapper viewport
const updateHeaderPosition = () => {
  if (!trackHeaderRef.value || !trackWrapperRef.value) return
  
  // Find the tracks-scroll-wrapper ancestor
  const scrollWrapper = trackWrapperRef.value.closest('.tracks-scroll-wrapper')
  if (!scrollWrapper) return
  
  const scrollRect = scrollWrapper.getBoundingClientRect()
  const wrapperRect = trackWrapperRef.value.getBoundingClientRect()
  
  // Calculate right offset: distance from track-wrapper's right edge to scroll wrapper's right edge
  // Since header is positioned relative to track-wrapper, positive right value moves it LEFT
  // If wrapperRight > scrollWrapperRight, we need positive offset to move header left
  const rightOffset = wrapperRect.right - scrollRect.right
  
  // If offset is positive, wrapper extends beyond viewport - use positive value to move header left
  // If offset is negative or zero, wrapper is within viewport - position header at wrapper's right edge (0)
  const finalOffset = Math.max(0, rightOffset)
  
  // Position header at the right edge of the scroll wrapper viewport
  // Positive value moves header left from wrapper's right edge
  trackHeaderRef.value.style.right = `${finalOffset}px`
}

onMounted(() => {
  nextTick(() => {
    updateHeaderPosition()
    
    // Update on scroll
    const scrollWrapper = trackRef.value?.closest('.tracks-scroll-wrapper')
    if (scrollWrapper) {
      scrollWrapper.addEventListener('scroll', updateHeaderPosition)
    }
    
    // Update on resize
    window.addEventListener('resize', updateHeaderPosition)
  })
})

onUnmounted(() => {
  const scrollWrapper = trackWrapperRef.value?.closest('.tracks-scroll-wrapper')
  if (scrollWrapper) {
    scrollWrapper.removeEventListener('scroll', updateHeaderPosition)
  }
  window.removeEventListener('resize', updateHeaderPosition)
})

// Watch for track position changes (e.g., when blocks are added/removed)
watch(() => [props.blocks, props.trackIndex], () => {
  nextTick(() => {
    updateHeaderPosition()
  })
}, { deep: true })

const handleDrop = (event) => {
  isActive.value = false
  const data = event.dataTransfer.getData('application/json')
  if (data) {
    try {
      const blockData = JSON.parse(data)
      
      // Calculate drop position based on mouse position
      const trackContent = trackContentRef.value
      let dropTime = 0
      if (trackContent) {
        const rect = trackContent.getBoundingClientRect()
        const x = event.clientX - rect.left
        dropTime = Math.max(0, x / props.pixelsPerSecond)
      }
      
      // Check if this is a block being moved from another track
      if (blockData.type === 'block') {
        emit('drop-block', {
          fileId: blockData.fileId,
          duration: blockData.duration,
          trackIndex: props.trackIndex,
          dropTime,
          sourceTrackIndex: blockData.trackIndex,
          color: blockData.color
        })
      } else {
        // New block from library
        emit('drop-block', {
          fileId: blockData.fileId,
          file: blockData.file,
          duration: blockData.duration,
          trackIndex: props.trackIndex,
          dropTime,
          color: blockData.color // Explicitly pass color from library
        })
      }
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
  background: #fafafa;
  transition: background 0.2s ease;
  border-bottom: 1px solid #e0e0e0;
  position: relative;
}

.track.track-active {
  background: #f0f2ff;
}

.track-wrapper {
  position: relative;
}

.track-content {
  padding-right: 200px; /* Space for header */
}

.track-header {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  border-left: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  border-radius: 0 0 0 4px;
  z-index: 10;
  min-height: 24px;
  pointer-events: auto;
}

.track-name-input {
  width: 100px;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.75em;
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
  gap: 3px;
}

.track-btn {
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 3px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
  padding: 0;
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
  width: 12px;
  height: 12px;
}

.track-volume {
  width: 60px;
  height: 3px;
  cursor: pointer;
}

.track-content {
  position: relative;
  height: 80px;
  overflow: hidden;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 49px,
    #e0e0e0 49px,
    #e0e0e0 50px
  );
}
</style>
