<template>
  <div
    class="audio-block"
    :class="{ dragging: isDragging, 'block-playing': isPlaying }"
    :style="blockStyle"
    draggable="true"
    @mousedown="handleMouseDown"
    @touchstart="handleMouseDown"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    :title="`${file.name} (${formatDuration(duration)})`"
  >
    <div class="block-content">
      <span class="block-name">{{ file.name }}</span>
      <span class="block-duration">{{ formatDuration(duration) }}</span>
    </div>
    <button 
      class="block-delete" 
      @click.stop="handleDelete"
      title="Delete block"
    >
      ×
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatTime } from '../utils/timeFormat'

const props = defineProps({
  file: {
    type: File,
    required: true
  },
  fileId: {
    type: String,
    required: true
  },
  blockId: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  startTime: {
    type: Number,
    default: 0
  },
  trackIndex: {
    type: Number,
    required: true
  },
  pixelsPerSecond: {
    type: Number,
    default: 50
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['drag-start', 'drag-move', 'drag-end', 'delete', 'update:startTime'])

const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartTime = ref(0)
const isHtml5Dragging = ref(false)
const touchDragStarted = ref(false) // Track if touch drag has actually started (after threshold)
let mouseMoveHandler = null
let mouseUpHandler = null
let touchMoveHandler = null
let touchEndHandler = null
let touchStartX = 0
let touchStartY = 0

const blockStyle = computed(() => {
  const width = props.duration * props.pixelsPerSecond
  const left = props.startTime * props.pixelsPerSecond
  const style = {
    width: `${width}px`,
    left: `${left}px`
  }
  if (props.color) {
    // Use 'background' instead of 'backgroundColor' to override the CSS gradient
    style.background = props.color
  }
  return style
})

const formatDuration = (seconds) => {
  return formatTime(seconds)
}

const cleanupMouseListeners = () => {
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler)
    mouseMoveHandler = null
  }
  if (mouseUpHandler) {
    document.removeEventListener('mouseup', mouseUpHandler)
    mouseUpHandler = null
  }
  if (touchMoveHandler) {
    document.removeEventListener('touchmove', touchMoveHandler)
    touchMoveHandler = null
  }
  if (touchEndHandler) {
    document.removeEventListener('touchend', touchEndHandler)
    touchEndHandler = null
  }
}

const handleMouseDown = (event) => {
  // Don't start mouse-based dragging if HTML5 drag is active
  if (isHtml5Dragging.value) return
  
  // Clean up any existing listeners first
  cleanupMouseListeners()
  
  const isTouch = event.type === 'touchstart' || event.touches
  const clientX = isTouch ? event.touches[0].clientX : event.clientX
  const clientY = isTouch ? event.touches[0].clientY : event.clientY
  
  // Store initial touch position for threshold detection
  if (isTouch) {
    touchStartX = clientX
    touchStartY = clientY
    touchDragStarted.value = false
    // Don't prevent default yet - wait for threshold
  } else {
    // For mouse, start dragging immediately
    isDragging.value = true
    dragStartX.value = clientX
    dragStartTime.value = props.startTime
    
    emit('drag-start', {
      blockId: props.blockId,
      fileId: props.fileId,
      trackIndex: props.trackIndex,
      startTime: props.startTime
    })
  }
  
  dragStartX.value = clientX
  dragStartTime.value = props.startTime

  mouseMoveHandler = (moveEvent) => {
    if (isHtml5Dragging.value) {
      cleanupMouseListeners()
      return
    }
    
    const isTouchMove = moveEvent.type === 'touchmove' || moveEvent.touches
    const currentX = isTouchMove ? (moveEvent.touches?.[0]?.clientX) : moveEvent.clientX
    const currentY = isTouchMove ? (moveEvent.touches?.[0]?.clientY) : moveEvent.clientY
    
    if (currentX === undefined) return
    
    // For touch, check threshold before starting drag
    if (isTouchMove && !touchDragStarted.value) {
      const deltaX = Math.abs(currentX - touchStartX)
      const deltaY = Math.abs(currentY - touchStartY)
      const threshold = 10 // pixels
      
      // If moved beyond threshold, start dragging
      if (deltaX > threshold || deltaY > threshold) {
        touchDragStarted.value = true
        isDragging.value = true
        // Prevent scrolling now that we're dragging
        document.body.style.overflow = 'hidden'
        
        emit('drag-start', {
          blockId: props.blockId,
          fileId: props.fileId,
          trackIndex: props.trackIndex,
          startTime: props.startTime
        })
      } else {
        // Still below threshold, allow scrolling
        return
      }
    }
    
    // Only process drag if dragging has started
    if (!isDragging.value) return
    
    // Prevent default to stop scrolling during drag
    if (isTouchMove) {
      moveEvent.preventDefault()
    }
    
    const deltaX = currentX - dragStartX.value
    const deltaTime = deltaX / props.pixelsPerSecond
    const newStartTime = Math.max(0, dragStartTime.value + deltaTime)
    
    // Emit drag move with current position for cross-track tracking
    emit('drag-move', {
      blockId: props.blockId,
      newStartTime,
      currentX: currentX,
      currentY: currentY
    })
  }

  mouseUpHandler = (upEvent) => {
    const isTouchEnd = upEvent.type === 'touchend' || upEvent.type === 'touchcancel'
    
    // Restore scrolling if it was disabled
    if (isTouchEnd && touchDragStarted.value) {
      document.body.style.overflow = ''
    }
    
    if (isDragging.value) {
      isDragging.value = false
      emit('drag-end', {
        blockId: props.blockId
      })
    }
    
    touchDragStarted.value = false
    cleanupMouseListeners()
  }

  touchMoveHandler = mouseMoveHandler
  touchEndHandler = mouseUpHandler

  document.addEventListener('mousemove', mouseMoveHandler)
  document.addEventListener('mouseup', mouseUpHandler)
  document.addEventListener('touchmove', touchMoveHandler, { passive: false })
  document.addEventListener('touchend', touchEndHandler)
  document.addEventListener('touchcancel', touchEndHandler)
}

const handleDragStart = (event) => {
  // Stop mouse-based dragging if active
  if (isDragging.value) {
    isDragging.value = false
    cleanupMouseListeners()
    emit('drag-end', {
      blockId: props.blockId
    })
  }
  
  // Mark that HTML5 drag is starting
  isHtml5Dragging.value = true
  
  // Set data for HTML5 drag and drop (for cross-track dragging)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: 'block',
    blockId: props.blockId,
    fileId: props.fileId,
    trackIndex: props.trackIndex,
    startTime: props.startTime,
    duration: props.duration,
    color: props.color
  }))
}

const handleDragEnd = () => {
  // Reset flag when drag ends
  isHtml5Dragging.value = false
  // Also ensure mouse dragging is stopped
  if (isDragging.value) {
    isDragging.value = false
    cleanupMouseListeners()
  }
}

const handleDelete = () => {
  emit('delete', props.blockId)
}
</script>

<style scoped>
.audio-block {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  cursor: grab;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.1s ease, box-shadow 0.1s ease, background-color 0.2s ease, background-image 0.2s ease;
  min-width: 80px;
  z-index: 2;
}

.audio-block:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.audio-block.dragging {
  cursor: grabbing;
  transform: scale(1.05);
  z-index: 10;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.audio-block.block-playing {
  background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.block-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.block-name {
  font-size: 0.85em;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block-duration {
  font-size: 0.75em;
  color: rgba(255, 255, 255, 0.9);
}

.block-delete {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2em;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
}

.block-delete:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}
</style>
