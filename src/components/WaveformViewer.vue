<template>
  <div class="progress-container">
    <div class="progress-wrapper" ref="progressWrapper">
      <canvas
        ref="waveformCanvas"
        class="waveform-canvas"
        @wheel.prevent="handleWheelZoom"
        @mousedown="handleCanvasMouseDownSelection"
        @touchstart="handleCanvasMouseDownSelection"
      ></canvas>
      <!-- Drag selection overlay -->
      <div 
        v-if="isDraggingSelection"
        class="drag-selection"
        :style="dragSelectionStyle"
      ></div>
      <div 
        class="loop-markers" 
        v-if="loopStart !== null || loopEnd !== null"
        :key="`${zoomLevel}-${zoomOffset}`"
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
    <!-- Scrollbar for zoomed view -->
    <input
      v-if="zoomLevel > 1 && duration > 0"
      type="range"
      class="zoom-scrollbar"
      :min="0"
      :max="scrollbarMax"
      v-model.number="scrollbarInputValue"
      @input="handleScrollbarInput"
      :title="`Scroll: ${formatTime(visibleStartTime)} - ${formatTime(visibleEndTime)}`"
    />
    <!-- Zoom controls (below scrollbar) -->
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { formatTime } from '../utils/timeFormat'
import { useZoom } from '../composables/useZoom'
import { useWaveform } from '../composables/useWaveform'

// Constants
const DRAG_THRESHOLD_PX = 5
const DRAG_THRESHOLD_MS = 100
const MIN_SELECTION_DURATION = 0.1
const MIN_MARKER_SPACING = 0.1
const WAVEFORM_INIT_DELAY = 200
const SCROLLBAR_RESET_DELAY = 100

// Props
const props = defineProps({
  file: {
    type: File,
    required: true
  },
  audioPlayer: {
    type: Object,
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

// Emits
const emit = defineEmits(['update:loopStart', 'update:loopEnd'])

// Template refs
const progressWrapper = ref(null)
const draggingMarker = ref(null)
const waveformCanvas = ref(null)

// Drag selection state
const isDraggingSelection = ref(false)
const dragStartX = ref(0)
const dragCurrentX = ref(0)
const dragStartTime = ref(0)

// Use zoom composable
const {
  zoomLevel,
  zoomOffset,
  scrollbarMax,
  scrollbarValue,
  visibleStartTime,
  visibleEndTime,
  zoomIn: zoomInFn,
  zoomOut: zoomOutFn,
  resetZoom: resetZoomFn,
  handleWheelZoom: handleWheelZoomFn,
  handleScrollbarInput: handleScrollbarInputFn
} = useZoom(() => props.duration, () => props.loopStart, () => props.loopEnd)

// Use waveform composable - pass our template refs
const {
  initAudioContext,
  preprocessWaveform,
  drawWaveform,
  handleCanvasClick: handleCanvasClickBase,
  getTimeFromPosition,
  getLoopMarkerPosition,
  getLoopRangeStyle,
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

// Computed properties
/**
 * Formats loop marker position for CSS
 * @param {number | null} time
 * @returns {string}
 */
const formatLoopMarkerPosition = (time) => {
  if (time === null || !props.duration) return '0%'
  const position = getLoopMarkerPosition(time)
  if (!position) return '0%'
  return position.type === 'percentage' ? `${position.value}%` : position.value
}

const loopStartPosition = computed(() => formatLoopMarkerPosition(props.loopStart))
const loopEndPosition = computed(() => formatLoopMarkerPosition(props.loopEnd))
const loopRangeStyle = computed(() => getLoopRangeStyle(props.loopStart, props.loopEnd))

// Scrollbar state
const scrollbarInputValue = ref(0)
const isDraggingScrollbar = ref(false)

// Sync scrollbarInputValue with scrollbarValue when it changes externally (but not during dragging)
watch(scrollbarValue, (newValue) => {
  if (!isDraggingScrollbar.value) {
    scrollbarInputValue.value = newValue
  }
}, { immediate: true })

// Zoom handlers
const redrawWaveform = () => drawWaveform()

const zoomIn = () => zoomInFn(redrawWaveform)
const zoomOut = () => zoomOutFn(redrawWaveform)
const resetZoom = () => resetZoomFn(redrawWaveform)
const handleWheelZoom = (event) => handleWheelZoomFn(event, waveformCanvas, redrawWaveform)

const handleScrollbarInput = () => {
  isDraggingScrollbar.value = true
  
  const rawValue = scrollbarInputValue.value
  if (isNaN(rawValue)) {
    isDraggingScrollbar.value = false
    return
  }
  
  const syntheticEvent = { target: { value: rawValue } }
  handleScrollbarInputFn(syntheticEvent, redrawWaveform)
  
  setTimeout(() => {
    isDraggingScrollbar.value = false
  }, SCROLLBAR_RESET_DELAY)
}

// Utility functions
/**
 * Extracts clientX from mouse or touch events
 * @param {MouseEvent | TouchEvent} event
 * @returns {number | null}
 */
const getClientX = (event) => {
  if (!event) return null
  
  if (event.touches?.length > 0) {
    return event.touches[0].clientX
  }
  if (event.changedTouches?.length > 0) {
    return event.changedTouches[0].clientX
  }
  if (typeof event.clientX === 'number') {
    return event.clientX
  }
  return null
}

/**
 * Clamps a value between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

/**
 * Cleanup document event listeners and restore body styles
 * @param {Object} handlers - Object with event handler functions
 */
const cleanupDocumentListeners = (handlers) => {
  const events = [
    { name: 'mousemove', handler: handlers.mousemove },
    { name: 'mouseup', handler: handlers.mouseup },
    { name: 'touchmove', handler: handlers.touchmove },
    { name: 'touchend', handler: handlers.touchend }
  ]
  
  events.forEach(({ name, handler }) => {
    if (handler) {
      document.removeEventListener(name, handler)
    }
  })
  
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

// Drag selection handlers
/**
 * Handles canvas mouse/touch down to start drag selection or seek
 */
const handleCanvasMouseDownSelection = (event) => {
  // Don't start selection if clicking on a marker or zoom controls
  if (draggingMarker.value || event.target.closest('.zoom-controls')) {
    return
  }
  
  if (!progressWrapper.value || !props.duration) return
  
  const clientX = getClientX(event)
  if (clientX === null) return
  
  const rect = progressWrapper.value.getBoundingClientRect()
  const x = clientX - rect.left
  
  // Check if click is within canvas bounds
  if (x < 0 || x > rect.width) return
  
  // Initialize drag state
  dragStartX.value = x
  dragCurrentX.value = x
  dragStartTime.value = getTimeFromPosition(clientX, progressWrapper.value)
  isDraggingSelection.value = false
  
  // Store initial position to detect if it's a drag
  const initialX = x
  const initialTime = Date.now()
  
  const checkDrag = (moveEvent) => {
    if (!moveEvent) return
    
    const moveClientX = getClientX(moveEvent)
    if (moveClientX === null) return
    
    const moveX = moveClientX - rect.left
    const moveDistance = Math.abs(moveX - initialX)
    const timeElapsed = Date.now() - initialTime
    
    // If moved more than threshold, consider it a drag
    if (moveDistance > DRAG_THRESHOLD_PX || timeElapsed > DRAG_THRESHOLD_MS) {
      if (!isDraggingSelection.value) {
        isDraggingSelection.value = true
        document.body.style.cursor = 'crosshair'
      }
      handleSelectionDrag(moveEvent)
    }
  }
  
  const handleMouseMove = (moveEvent) => {
    checkDrag(moveEvent)
  }
  
  const handleMouseUp = (upEvent) => {
    if (isDraggingSelection.value) {
      stopSelectionDrag(upEvent)
    } else {
      // It was just a click, seek to position
      handleCanvasClickBase(upEvent)
    }
    cleanupDocumentListeners({ 
      mousemove: handleMouseMove, 
      mouseup: handleMouseUp, 
      touchmove: handleMouseMove, 
      touchend: handleMouseUp 
    })
  }
  
  // Add event listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleMouseMove)
  document.addEventListener('touchend', handleMouseUp)
  document.body.style.userSelect = 'none'
  
  event.preventDefault()
}

/**
 * Handles selection drag movement
 */
const handleSelectionDrag = (event) => {
  if (!progressWrapper.value || !event) return
  
  const clientX = getClientX(event)
  if (clientX === null) return
  
  const rect = progressWrapper.value.getBoundingClientRect()
  dragCurrentX.value = clamp(clientX - rect.left, 0, rect.width)
  
  if (!isDraggingSelection.value) {
    isDraggingSelection.value = true
  }
}

/**
 * Stops selection drag and sets loop markers if selection is valid
 */
const stopSelectionDrag = (event) => {
  if (!isDraggingSelection.value || !progressWrapper.value || !props.duration || !event) {
    cleanupSelectionDrag()
    return
  }
  
  const clientX = getClientX(event)
  if (clientX === null) {
    cleanupSelectionDrag()
    return
  }
  
  const endTime = getTimeFromPosition(clientX, progressWrapper.value)
  
  if (dragStartTime.value !== null && endTime !== null) {
    const startTime = Math.min(dragStartTime.value, endTime)
    const finalEndTime = Math.max(dragStartTime.value, endTime)
    const selectionDuration = Math.abs(finalEndTime - startTime)
    
    // Only set if there's a meaningful selection (at least minimum duration)
    if (selectionDuration >= MIN_SELECTION_DURATION) {
      emit('update:loopStart', clamp(startTime, 0, props.duration))
      emit('update:loopEnd', clamp(finalEndTime, 0, props.duration))
    }
  }
  
  cleanupSelectionDrag()
}

/**
 * Resets drag selection state
 */
const cleanupSelectionDrag = () => {
  isDraggingSelection.value = false
  dragStartX.value = 0
  dragCurrentX.value = 0
  dragStartTime.value = 0
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

/**
 * Computed style for drag selection overlay
 */
const dragSelectionStyle = computed(() => {
  if (!isDraggingSelection.value || !progressWrapper.value) {
    return { display: 'none' }
  }
  
  const rect = progressWrapper.value.getBoundingClientRect()
  const startX = Math.min(dragStartX.value, dragCurrentX.value)
  const endX = Math.max(dragStartX.value, dragCurrentX.value)
  const width = endX - startX
  
  return {
    left: `${(startX / rect.width) * 100}%`,
    width: `${(width / rect.width) * 100}%`,
    display: 'block'
  }
})

// Loop marker drag handlers
/**
 * Starts dragging a loop marker
 * @param {'start' | 'end'} marker
 * @param {MouseEvent | TouchEvent} event
 */
const startDrag = (marker, event) => {
  draggingMarker.value = marker
  const clientX = getClientX(event)
  if (clientX !== null) {
    updateMarkerPosition(clientX)
  }
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', handleDrag)
  document.addEventListener('touchend', stopDrag)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'grabbing'
}

/**
 * Handles marker drag movement
 */
const handleDrag = (event) => {
  if (!draggingMarker.value) return
  const clientX = getClientX(event)
  if (clientX !== null) {
    updateMarkerPosition(clientX)
  }
}

/**
 * Stops marker dragging
 */
const stopDrag = () => {
  draggingMarker.value = null
  cleanupDocumentListeners({ 
    mousemove: handleDrag, 
    mouseup: stopDrag, 
    touchmove: handleDrag, 
    touchend: stopDrag 
  })
}

/**
 * Updates marker position based on clientX
 * @param {number} clientX
 */
const updateMarkerPosition = (clientX) => {
  if (!draggingMarker.value || !props.duration || !progressWrapper.value) return
  
  const time = getTimeFromPosition(clientX, progressWrapper.value)
  if (time === null) return
  
  if (draggingMarker.value === 'start') {
    const maxStart = props.loopEnd !== null ? props.loopEnd - MIN_MARKER_SPACING : props.duration
    const newStart = clamp(time, 0, maxStart)
    emit('update:loopStart', newStart)
  } else if (draggingMarker.value === 'end') {
    const minEnd = props.loopStart !== null ? props.loopStart + MIN_MARKER_SPACING : 0
    const newEnd = clamp(time, minEnd, props.duration)
    emit('update:loopEnd', newEnd)
  }
}
// Lifecycle hooks
/**
 * Watches for canvas, duration and file changes to initialize waveform
 */
watch(
  [waveformCanvas, () => props.duration, () => props.file],
  async ([canvas, newDuration, newFile]) => {
    if (canvas && newFile && newDuration > 0) {
      await nextTick()
      setTimeout(() => {
        if (canvas?.offsetWidth > 0 && canvas?.offsetHeight > 0) {
          initAudioContext()
        }
      }, WAVEFORM_INIT_DELAY)
    }
  },
  { immediate: true }
)

/**
 * Cleanup on component unmount
 */
onUnmounted(() => {
  stopDrag()
  cleanupSelectionDrag()
  cleanupWaveform()
})
</script>

<style scoped>
.progress-container {
  display: flex;
  flex-direction: column;
}

.progress-wrapper {
  position: relative;
  width: 100%;
  height: 120px;
  margin-bottom: 10px;
}

.zoom-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  margin-left: auto;
  width: fit-content;
  align-self: flex-end;
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

.zoom-reset {
  margin-left: 4px;
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
  touch-action: none;
}

.loop-markers {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allow clicks to pass through to canvas */
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
  pointer-events: none; /* Allow clicks to pass through */
}

.drag-selection {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(102, 126, 234, 0.25);
  border: 2px solid #667eea;
  border-radius: 4px;
  z-index: 2;
  pointer-events: none;
  transition: none;
}

.zoom-scrollbar {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  margin-bottom: 10px;
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
