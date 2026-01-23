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

const handleMouseDown = (event) => {
  // Don't start mouse-based dragging if HTML5 drag is active
  if (isHtml5Dragging.value) return
  
  isDragging.value = true
  dragStartX.value = event.clientX || event.touches[0].clientX
  dragStartTime.value = props.startTime
  
  emit('drag-start', {
    fileId: props.fileId,
    trackIndex: props.trackIndex,
    startTime: props.startTime
  })

  const handleMouseMove = (moveEvent) => {
    if (!isDragging.value || isHtml5Dragging.value) return
    
    const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX)
    if (currentX === undefined) return
    
    const deltaX = currentX - dragStartX.value
    const deltaTime = deltaX / props.pixelsPerSecond
    const newStartTime = Math.max(0, dragStartTime.value + deltaTime)
    
    emit('drag-move', {
      fileId: props.fileId,
      newStartTime
    })
  }

  const handleMouseUp = () => {
    if (isDragging.value) {
      isDragging.value = false
      emit('drag-end', {
        fileId: props.fileId
      })
    }
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('touchmove', handleMouseMove)
    document.removeEventListener('touchend', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleMouseMove)
  document.addEventListener('touchend', handleMouseUp)
}

const handleDragStart = (event) => {
  // Mark that HTML5 drag is starting
  isHtml5Dragging.value = true
  
  // Set data for HTML5 drag and drop (for cross-track dragging)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: 'block',
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
}

const handleDelete = () => {
  emit('delete', props.fileId)
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
