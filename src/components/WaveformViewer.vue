<template>
  <div class="progress-container">
    <div class="progress-wrapper" ref="progressWrapper">
      <canvas
        ref="waveformCanvas"
        class="waveform-canvas"
        @click="handleCanvasClick"
        @wheel.prevent="handleWheelZoom"
        @mousedown="handleCanvasMouseDown"
        @mousemove="handleCanvasMouseMove"
        @mouseup="handleCanvasMouseUp"
        @mouseleave="handleCanvasMouseUp"
      ></canvas>
      <div class="zoom-controls">
        <button 
          class="zoom-btn" 
          @click="zoomOut"
          :disabled="zoomLevel <= 1"
          title="Zoom Out"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <span class="zoom-level">{{ zoomLevel.toFixed(1) }}x</span>
        <button 
          class="zoom-btn" 
          @click="zoomIn"
          :disabled="zoomLevel >= 10"
          title="Zoom In"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button 
          class="zoom-btn zoom-reset" 
          @click="resetZoom"
          :disabled="zoomLevel === 1 && zoomOffset === 0"
          title="Reset Zoom"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
        </button>
        <button 
          class="zoom-btn zoom-fit" 
          @click="zoomToLoop"
          :disabled="loopStart === null || loopEnd === null"
          title="Zoom to Loop"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M8 12h8"></path>
            <path d="M12 8v8"></path>
          </svg>
        </button>
      </div>
      <div 
        class="loop-markers" 
        v-if="loopStart !== null || loopEnd !== null"
        @mousedown.prevent="handleMarkerMouseDown"
        @touchstart.prevent="handleMarkerTouchStart"
      >
        <div 
          v-if="loopStart !== null"
          class="loop-marker loop-start"
          :class="{ dragging: draggingMarker === 'start' }"
          :style="{ left: loopStartPosition }"
          :title="`Loop Start: ${formatTime(loopStart)} - Drag to adjust`"
          @mousedown.stop.prevent="startDrag('start', $event)"
          @touchstart.stop.prevent="startDrag('start', $event)"
        ></div>
        <div 
          v-if="loopEnd !== null"
          class="loop-marker loop-end"
          :class="{ dragging: draggingMarker === 'end' }"
          :style="{ left: loopEndPosition }"
          :title="`Loop End: ${formatTime(loopEnd)} - Drag to adjust`"
          @mousedown.stop.prevent="startDrag('end', $event)"
          @touchstart.stop.prevent="startDrag('end', $event)"
        ></div>
        <div 
          v-if="loopStart !== null && loopEnd !== null"
          class="loop-range"
          :style="loopRangeStyle"
        ></div>
      </div>
    </div>
    <div class="loop-info" v-if="loopStart !== null || loopEnd !== null">
      <span v-if="loopStart !== null">Start: {{ formatTime(loopStart) }}</span>
      <span v-if="loopEnd !== null">End: {{ formatTime(loopEnd) }}</span>
    </div>
    <!-- Scrollbar for zoomed view -->
    <input
      v-if="zoomLevel > 1 && duration > 0"
      type="range"
      class="zoom-scrollbar"
      :min="0"
      :max="scrollbarMax"
      :value="scrollbarValue"
      @input="handleScrollbarInput"
      :title="`Scroll: ${formatTime(visibleStartTime)} - ${formatTime(visibleEndTime)}`"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, onMounted, nextTick } from 'vue'
import { formatTime } from '../utils/timeFormat'
import { useZoom } from '../composables/useZoom'
import { useWaveform } from '../composables/useWaveform'

const props = defineProps({
  file: {
    type: File,
    required: true
  },
  audioPlayer: {
    type: Object,
    required: false,
    default: null
  },
  duration: {
    type: Number,
    required: true
  },
  currentTime: {
    type: Number,
    required: true
  },
  loopStart: {
    type: Number,
    default: null
  },
  loopEnd: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['seek', 'update:loopStart', 'update:loopEnd'])

const waveformViewerRef = ref(null)
const progressWrapper = ref(null)
const draggingMarker = ref(null)
const waveformCanvas = ref(null)

// Use zoom composable
const {
  zoomLevel,
  zoomOffset,
  scrollbarMax,
  scrollbarValue,
  visibleStartTime,
  visibleEndTime,
  visibleDurationTime,
  zoomIn: zoomInFn,
  zoomOut: zoomOutFn,
  resetZoom: resetZoomFn,
  zoomToLoop: zoomToLoopFn,
  handleWheelZoom: handleWheelZoomFn,
  handleScrollbarInput: handleScrollbarInputFn
} = useZoom(() => props.duration, () => props.loopStart, () => props.loopEnd)

// Use waveform composable - pass our template refs
const {
  initAudioContext,
  preprocessWaveform,
  drawWaveform,
  handleCanvasClick: handleCanvasClickBase,
  handleCanvasMouseDown: handleCanvasMouseDownBase,
  handleCanvasMouseMove: handleCanvasMouseMoveBase,
  handleCanvasMouseUp: handleCanvasMouseUpBase,
  getTimeFromPosition,
  cleanup: cleanupWaveform
} = useWaveform(
  () => props.audioPlayer,
  () => props.file,
  () => props.duration,
  () => props.currentTime,
  () => props.loopStart,
  () => props.loopEnd,
  zoomLevel,
  zoomOffset,
  waveformCanvas, // Pass our template ref
  progressWrapper // Pass our template ref
)

// Expose canvas ref and methods for parent component
defineExpose({
  waveformCanvas,
  progressWrapper,
  initAudioContext,
  preprocessWaveform,
  drawWaveform
})

// Computed properties for loop marker positions
// These must match the EXACT calculation in useWaveform.js drawWaveform function
const loopStartPosition = computed(() => {
  if (props.loopStart === null || !props.duration) return '0%'
  
  // Use the exact same calculation as useWaveform.js
  const durationVal = props.duration
  const zoomLevelVal = zoomLevel.value
  const zoomOffsetVal = zoomOffset.value
  const loopStartVal = props.loopStart
  
  const visibleDuration = durationVal / zoomLevelVal
  const maxOffset = Math.max(0, durationVal - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffsetVal))
  const visibleStart = clampedOffset
  const visibleEnd = clampedOffset + visibleDuration
  
  // Match the exact logic from useWaveform.js
  if (loopStartVal < visibleStart) {
    return '-6px'
  } else if (loopStartVal > visibleEnd) {
    return 'calc(100% + 6px)'
  } else {
    // Use the exact same formula: (time - visibleStart) / visibleDuration * 100%
    const position = ((loopStartVal - visibleStart) / visibleDuration) * 100
    return `${Math.max(0, Math.min(100, position))}%`
  }
})

const loopEndPosition = computed(() => {
  if (props.loopEnd === null || !props.duration) return '0%'
  
  // Use the exact same calculation as useWaveform.js
  const durationVal = props.duration
  const zoomLevelVal = zoomLevel.value
  const zoomOffsetVal = zoomOffset.value
  const loopEndVal = props.loopEnd
  
  const visibleDuration = durationVal / zoomLevelVal
  const maxOffset = Math.max(0, durationVal - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffsetVal))
  const visibleStart = clampedOffset
  const visibleEnd = clampedOffset + visibleDuration
  
  // Match the exact logic from useWaveform.js
  if (loopEndVal < visibleStart) {
    return '-6px'
  } else if (loopEndVal > visibleEnd) {
    return 'calc(100% + 6px)'
  } else {
    // Use the exact same formula: (time - visibleStart) / visibleDuration * 100%
    const position = ((loopEndVal - visibleStart) / visibleDuration) * 100
    return `${Math.max(0, Math.min(100, position))}%`
  }
})

const loopRangeStyle = computed(() => {
  if (props.loopStart === null || props.loopEnd === null || !props.duration) {
    return { left: '0%', width: '0%' }
  }
  
  // Use the exact same calculation as useWaveform.js
  const durationVal = props.duration
  const zoomLevelVal = zoomLevel.value
  const zoomOffsetVal = zoomOffset.value
  const loopStartVal = props.loopStart
  const loopEndVal = props.loopEnd
  
  const visibleDuration = durationVal / zoomLevelVal
  const maxOffset = Math.max(0, durationVal - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffsetVal))
  const visibleStart = clampedOffset
  const visibleEnd = clampedOffset + visibleDuration
  
  const rangeStart = Math.max(loopStartVal, visibleStart)
  const rangeEnd = Math.min(loopEndVal, visibleEnd)
  
  if (rangeEnd <= rangeStart) {
    return { left: '0%', width: '0%' }
  }
  
  const left = ((rangeStart - visibleStart) / visibleDuration) * 100
  const width = ((rangeEnd - rangeStart) / visibleDuration) * 100
  
  return {
    left: `${Math.max(0, Math.min(100, left))}%`,
    width: `${Math.max(0, Math.min(100, width))}%`
  }
})

// Zoom functions that also trigger waveform redraw
const zoomIn = () => zoomInFn(() => drawWaveform())
const zoomOut = () => zoomOutFn(() => drawWaveform())
const resetZoom = () => resetZoomFn(() => drawWaveform())
const zoomToLoop = () => zoomToLoopFn(() => drawWaveform())
const handleWheelZoom = (event) => handleWheelZoomFn(event, waveformCanvas, () => drawWaveform())
const handleScrollbarInput = (event) => handleScrollbarInputFn(event, () => drawWaveform())

// Canvas click handler - composable handles seeking directly
const handleCanvasClick = (event) => {
  handleCanvasClickBase(event)
}

// Drag handlers for loop markers
const startDrag = (marker, event) => {
  draggingMarker.value = marker
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  updateMarkerPosition(clientX)
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', handleDrag)
  document.addEventListener('touchend', stopDrag)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'grabbing'
}

const handleDrag = (event) => {
  if (!draggingMarker.value) return
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  updateMarkerPosition(clientX)
}

const stopDrag = () => {
  draggingMarker.value = null
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('touchend', stopDrag)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

const updateMarkerPosition = (clientX) => {
  if (!draggingMarker.value || !props.duration) return
  
  // Use progressWrapper from template ref
  if (!progressWrapper.value) return
  
  const time = getTimeFromPositionLocal(clientX)
  if (time === null) return
  
  if (draggingMarker.value === 'start') {
    const newStart = Math.max(0, Math.min(time, props.loopEnd !== null ? props.loopEnd - 0.1 : props.duration))
    emit('update:loopStart', newStart)
  } else if (draggingMarker.value === 'end') {
    const newEnd = Math.max(props.loopStart !== null ? props.loopStart + 0.1 : 0, Math.min(time, props.duration))
    emit('update:loopEnd', newEnd)
  }
}

const handleMarkerMouseDown = (event) => {
  if (!draggingMarker.value && event.target === progressWrapper.value) {
    const time = getTimeFromPosition(event.clientX, progressWrapper.value)
    if (time !== null) {
      if (props.loopStart !== null && props.loopEnd !== null) {
        const distToStart = Math.abs(time - props.loopStart)
        const distToEnd = Math.abs(time - props.loopEnd)
        if (distToStart < distToEnd && time < props.loopEnd) {
          emit('update:loopStart', Math.max(0, Math.min(time, props.loopEnd - 0.1)))
        } else if (time > props.loopStart) {
          emit('update:loopEnd', Math.max(props.loopStart + 0.1, Math.min(time, props.duration)))
        }
      }
    }
  }
}

const handleMarkerTouchStart = (event) => {
  if (!draggingMarker.value && event.target === progressWrapper.value && event.touches.length > 0) {
    const time = getTimeFromPositionLocal(event.touches[0].clientX)
    if (time !== null) {
      if (props.loopStart !== null && props.loopEnd !== null) {
        const distToStart = Math.abs(time - props.loopStart)
        const distToEnd = Math.abs(time - props.loopEnd)
        if (distToStart < distToEnd && time < props.loopEnd) {
          emit('update:loopStart', Math.max(0, Math.min(time, props.loopEnd - 0.1)))
        } else if (time > props.loopStart) {
          emit('update:loopEnd', Math.max(props.loopStart + 0.1, Math.min(time, props.duration)))
        }
      }
    }
  }
}

// Watch for canvas, duration and file to initialize waveform
watch([waveformCanvas, () => props.duration, () => props.file], async ([canvas, newDuration, newFile]) => {
  if (canvas && newFile && newDuration > 0) {
    await nextTick()
    setTimeout(() => {
      if (canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        initAudioContext()
      }
    }, 200)
  }
}, { immediate: true })

// Also try to initialize when component is mounted
onMounted(async () => {
  await nextTick()
  await nextTick()
  if (waveformCanvas.value && props.duration > 0 && props.file) {
    setTimeout(() => {
      if (waveformCanvas.value && waveformCanvas.value.offsetWidth > 0 && waveformCanvas.value.offsetHeight > 0) {
        initAudioContext()
      }
    }, 300)
  }
})

// Local helper that uses our progressWrapper ref and zoom state
const getTimeFromPositionLocal = (clientX) => {
  if (!progressWrapper.value || !props.duration) return null
  
  const rect = progressWrapper.value.getBoundingClientRect()
  const x = clientX - rect.left
  const visibleDuration = props.duration / zoomLevel.value
  const maxOffset = Math.max(0, props.duration - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffset.value))
  const pixelToTime = visibleDuration / rect.width
  return clampedOffset + (x * pixelToTime)
}

onUnmounted(() => {
  stopDrag()
  cleanupWaveform()
})
</script>

<style scoped>
.progress-container {
  margin-bottom: 20px;
}

.progress-wrapper {
  position: relative;
  width: 100%;
  height: 120px;
  margin-bottom: 10px;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.zoom-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  transition: all 0.2s ease;
  border-radius: 4px;
  width: 28px;
  height: 28px;
}

.zoom-btn:hover:not(:disabled) {
  background: #f0f2ff;
  transform: scale(1.1);
}

.zoom-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.zoom-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-btn svg {
  width: 18px;
  height: 18px;
}

.zoom-level {
  font-size: 0.85em;
  font-weight: 600;
  color: #667eea;
  min-width: 35px;
  text-align: center;
}

.zoom-reset,
.zoom-fit {
  margin-left: 4px;
}

.zoom-reset {
  padding-left: 6px;
  padding-right: 6px;
}

.zoom-fit {
  padding-left: 6px;
  padding-right: 6px;
}

.waveform-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  border-radius: 8px;
  background: #f0f2ff;
  user-select: none;
  -webkit-user-select: none;
}

.loop-markers {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  cursor: pointer;
  z-index: 3;
}

.loop-marker {
  position: absolute;
  top: 0;
  width: 12px;
  height: 100%;
  background: transparent;
  transform: translateX(-50%);
  z-index: 4;
  cursor: grab;
  pointer-events: auto;
  transition: transform 0.1s ease;
}

.loop-marker::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 16px;
  background: #ff6b6b;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.loop-marker:hover {
  transform: translateX(-50%) scale(1.2);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.loop-marker.dragging {
  cursor: grabbing;
  transform: translateX(-50%) scale(1.3);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  z-index: 4;
}

.loop-start::before {
  background: #51cf66;
}

.loop-start:hover::before {
  background: #40c057;
}

.loop-end::before {
  background: #ff6b6b;
}

.loop-end:hover::before {
  background: #ff5252;
}

.loop-range {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 4px;
  z-index: 1;
  pointer-events: none;
}

.loop-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.85em;
  color: #667eea;
  font-weight: 600;
}

.zoom-scrollbar {
  width: 100%;
  height: 8px;
  margin-top: 8px;
  margin-bottom: 10px;
  border-radius: 4px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.zoom-scrollbar:hover {
  background: #d0d0d0;
}

.zoom-scrollbar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.zoom-scrollbar::-webkit-slider-thumb:hover {
  background: #5568d3;
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.zoom-scrollbar::-webkit-slider-thumb:active {
  transform: scale(1.25);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
}

.zoom-scrollbar::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.zoom-scrollbar::-moz-range-thumb:hover {
  background: #5568d3;
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.zoom-scrollbar::-moz-range-thumb:active {
  transform: scale(1.25);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
}
</style>
