<template>
  <div class="player-section">
    <audio
      ref="audioPlayer"
      :src="audioUrl"
      preload="metadata"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="updateProgress"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="handleEnded"
    ></audio>

    <div class="player-controls">
      <button class="btn-control" @click="togglePlayPause">
        <svg v-if="!isPlaying" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      </button>
      
      <div class="progress-container">
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
        <div class="progress-wrapper">
          <input
            type="range"
            class="progress-bar"
            :min="0"
            :max="duration || 100"
            :value="currentTime"
            @input="seek"
            :style="{ pointerEvents: draggingMarker ? 'none' : 'auto' }"
          />
          <div 
            class="loop-markers" 
            v-if="loopStart !== null || loopEnd !== null"
            ref="progressWrapper"
            @mousedown.prevent="handleMarkerMouseDown"
            @touchstart.prevent="handleMarkerTouchStart"
          >
            <div 
              v-if="loopStart !== null"
              class="loop-marker loop-start"
              :class="{ dragging: draggingMarker === 'start' }"
              :style="{ left: `${(loopStart / duration) * 100}%` }"
              :title="`Loop Start: ${formatTime(loopStart)} - Drag to adjust`"
              @mousedown.stop="startDrag('start', $event)"
              @touchstart.stop="startDrag('start', $event)"
            ></div>
            <div 
              v-if="loopEnd !== null"
              class="loop-marker loop-end"
              :class="{ dragging: draggingMarker === 'end' }"
              :style="{ left: `${(loopEnd / duration) * 100}%` }"
              :title="`Loop End: ${formatTime(loopEnd)} - Drag to adjust`"
              @mousedown.stop="startDrag('end', $event)"
              @touchstart.stop="startDrag('end', $event)"
            ></div>
            <div 
              v-if="loopStart !== null && loopEnd !== null"
              class="loop-range"
              :style="{ 
                left: `${(loopStart / duration) * 100}%`,
                width: `${((loopEnd - loopStart) / duration) * 100}%`
              }"
            ></div>
          </div>
        </div>
        <div class="loop-info" v-if="loopStart !== null || loopEnd !== null">
          <span v-if="loopStart !== null">Start: {{ formatTime(loopStart) }}</span>
          <span v-if="loopEnd !== null">End: {{ formatTime(loopEnd) }}</span>
        </div>
      </div>

      <div class="volume-control">
        <svg class="volume-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <input
          type="range"
          class="volume-slider"
          min="0"
          max="100"
          :value="volume"
          @input="updateVolume"
        />
        <span>{{ volume }}%</span>
      </div>
    </div>

    <div class="loop-controls">
      <h3>Loop Controls</h3>
      <div class="loop-buttons">
        <button 
          class="loop-btn" 
          :class="{ active: loopStart !== null }"
          @click="setLoopStart"
        >
          Mark Loop Start
        </button>
        <button 
          class="loop-btn" 
          :class="{ active: loopEnd !== null }"
          @click="setLoopEnd"
        >
          Mark Loop End
        </button>
        <button 
          class="loop-btn loop-clear" 
          @click="clearLoop"
          v-if="loopStart !== null || loopEnd !== null"
        >
          Clear Loop
        </button>
      </div>
      <div class="loop-time-inputs">
        <div class="time-input-group">
          <label for="loopStartInput">Loop Start (MM:SS):</label>
          <div class="time-input-wrapper">
            <input
              id="loopStartInput"
              type="text"
              class="time-input"
              :value="loopStartInput"
              @input="handleLoopStartInput"
              @blur="applyLoopStartInput"
              @keypress.enter="applyLoopStartInput"
              placeholder="0:00"
            />
            <div class="time-input-buttons">
              <button 
                type="button" 
                class="time-btn time-btn-up" 
                @click="incrementLoopStart"
                :disabled="loopStart === null || duration === 0"
                title="Increase by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                class="time-btn time-btn-down" 
                @click="decrementLoopStart"
                :disabled="loopStart === null || loopStart <= 0"
                title="Decrease by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="time-input-group">
          <label for="loopEndInput">Loop End (MM:SS):</label>
          <div class="time-input-wrapper">
            <input
              id="loopEndInput"
              type="text"
              class="time-input"
              :value="loopEndInput"
              @input="handleLoopEndInput"
              @blur="applyLoopEndInput"
              @keypress.enter="applyLoopEndInput"
              placeholder="0:00"
            />
            <div class="time-input-buttons">
              <button 
                type="button" 
                class="time-btn time-btn-up" 
                @click="incrementLoopEnd"
                :disabled="loopEnd === null || loopEnd >= duration || (loopStart !== null && loopEnd >= duration - 0.1)"
                title="Increase by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                class="time-btn time-btn-down" 
                @click="decrementLoopEnd"
                :disabled="loopEnd === null || (loopStart !== null && loopEnd <= loopStart + 0.1)"
                title="Decrease by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="loop-toggle">
        <label class="loop-switch">
          <input type="checkbox" v-model="loopEnabled" :disabled="!isLoopValid">
          <span class="slider"></span>
          <span class="label-text">Enable Loop</span>
        </label>
        <span v-if="!isLoopValid && (loopStart !== null || loopEnd !== null)" class="loop-warning">
          Both start and end must be set to enable loop
        </span>
      </div>
    </div>

    <div class="speed-controls">
      <h3>Playback Speed</h3>
      <div class="speed-buttons">
        <button
          v-for="speed in speedOptions"
          :key="speed"
          class="speed-btn"
          :class="{ active: currentSpeed === speed }"
          @click="setPlaybackSpeed(speed)"
        >
          {{ speed }}x
        </button>
      </div>
      <div class="custom-speed">
        <label for="customSpeed">Custom Speed:</label>
        <input
          id="customSpeed"
          type="number"
          v-model.number="customSpeed"
          min="0.1"
          max="4"
          step="0.1"
          @keypress.enter="applyCustomSpeed"
        />
        <button class="btn-apply" @click="applyCustomSpeed">Apply</button>
      </div>
      <div class="current-speed-display">
        Current Speed: <span>{{ currentSpeed.toFixed(2) }}x</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  file: {
    type: File,
    required: true
  }
})

const audioPlayer = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(100)
const currentSpeed = ref(1)
const customSpeed = ref(1)
const loopStart = ref(null)
const loopEnd = ref(null)
const loopEnabled = ref(false)
const draggingMarker = ref(null)
const progressWrapper = ref(null)
const lastLoopJump = ref(0)
const loopStartInput = ref('')
const loopEndInput = ref('')
const isEditingStart = ref(false)
const isEditingEnd = ref(false)

const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

const audioUrl = computed(() => {
  return URL.createObjectURL(props.file)
})

const togglePlayPause = () => {
  if (audioPlayer.value.paused) {
    audioPlayer.value.play()
  } else {
    audioPlayer.value.pause()
  }
}

const handleLoadedMetadata = () => {
  duration.value = audioPlayer.value.duration
}

const updateProgress = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime
    
    // Check if we need to loop
    if (loopEnabled.value && loopStart.value !== null && loopEnd.value !== null) {
      const actualTime = audioPlayer.value.currentTime
      const now = Date.now()
      
      // Prevent rapid-fire loop jumps (minimum 100ms between jumps)
      // This is especially important when playback is slowed down
      if (now - lastLoopJump.value < 100) {
        return
      }
      
      // Check if we've clearly passed the loop end
      // Use a more lenient threshold for slow playback
      if (actualTime >= loopEnd.value) {
        lastLoopJump.value = now
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          if (audioPlayer.value && loopEnabled.value && loopStart.value !== null) {
            audioPlayer.value.currentTime = loopStart.value
          }
        })
      } 
      // Check if we're before loop start (only when playing)
      // Use a small buffer to prevent issues during slow playback
      else if (actualTime < loopStart.value && isPlaying.value && !audioPlayer.value.paused) {
        // Only jump if we're significantly before the start (not just slightly due to rounding)
        if (actualTime < loopStart.value - 0.1) {
          lastLoopJump.value = now
          requestAnimationFrame(() => {
            if (audioPlayer.value && loopEnabled.value && loopStart.value !== null) {
              audioPlayer.value.currentTime = loopStart.value
            }
          })
        }
      }
    }
  }
}

const seek = (event) => {
  const seekTime = parseFloat(event.target.value)
  if (audioPlayer.value) {
    audioPlayer.value.currentTime = seekTime
  }
}

const updateVolume = (event) => {
  const newVolume = parseInt(event.target.value)
  volume.value = newVolume
  if (audioPlayer.value) {
    audioPlayer.value.volume = newVolume / 100
  }
}

const handleEnded = () => {
  // If loop is enabled and valid, restart from loop start
  if (loopEnabled.value && loopStart.value !== null && loopEnd.value !== null) {
    if (audioPlayer.value) {
      // Use requestAnimationFrame to ensure smooth looping
      requestAnimationFrame(() => {
        if (audioPlayer.value && loopEnabled.value) {
          audioPlayer.value.currentTime = loopStart.value
          if (!audioPlayer.value.paused) {
            audioPlayer.value.play().catch(() => {
              // Ignore play promise errors (e.g., user interaction required)
            })
          }
        }
      })
    }
  } else {
    isPlaying.value = false
    currentTime.value = 0
    if (audioPlayer.value) {
      audioPlayer.value.currentTime = 0
    }
  }
}

const setPlaybackSpeed = (speed) => {
  currentSpeed.value = speed
  customSpeed.value = speed
  if (audioPlayer.value) {
    audioPlayer.value.playbackRate = speed
  }
}

const applyCustomSpeed = () => {
  const speed = parseFloat(customSpeed.value)
  if (speed >= 0.1 && speed <= 4) {
    setPlaybackSpeed(speed)
  } else {
    alert('Speed must be between 0.1x and 4x')
    customSpeed.value = currentSpeed.value
  }
}

const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const setLoopStart = () => {
  if (audioPlayer.value && duration.value > 0) {
    const time = audioPlayer.value.currentTime
    loopStart.value = time
    loopStartInput.value = formatTime(time)
    
    // If loop end exists and is before new start, clear it
    if (loopEnd.value !== null && loopEnd.value <= time) {
      loopEnd.value = null
      loopEndInput.value = ''
      loopEnabled.value = false
    }
  }
}

const setLoopEnd = () => {
  if (audioPlayer.value && duration.value > 0) {
    const time = audioPlayer.value.currentTime
    
    // Loop end must be after loop start
    if (loopStart.value !== null && time > loopStart.value) {
      loopEnd.value = time
      loopEndInput.value = formatTime(time)
    } else if (loopStart.value === null) {
      // If no start set, set end and warn
      alert('Please set loop start first, or the end will be ignored.')
      return
    } else {
      alert('Loop end must be after loop start.')
      return
    }
  }
}

const clearLoop = () => {
  loopStart.value = null
  loopEnd.value = null
  loopEnabled.value = false
  loopStartInput.value = ''
  loopEndInput.value = ''
}

// Parse time input (supports MM:SS format or plain seconds)
const parseTimeInput = (input) => {
  if (!input || input.trim() === '') return null
  
  const trimmed = input.trim()
  
  // Check if it's in MM:SS format
  const timeMatch = trimmed.match(/^(\d+):(\d{2})$/)
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10)
    const seconds = parseInt(timeMatch[2], 10)
    if (seconds >= 0 && seconds < 60 && minutes >= 0) {
      return minutes * 60 + seconds
    }
  }
  
  // Try parsing as plain seconds (number)
  const asNumber = parseFloat(trimmed)
  if (!isNaN(asNumber) && asNumber >= 0) {
    return asNumber
  }
  
  return null
}

const handleLoopStartInput = (event) => {
  isEditingStart.value = true
  loopStartInput.value = event.target.value
}

const handleLoopEndInput = (event) => {
  isEditingEnd.value = true
  loopEndInput.value = event.target.value
}

const applyLoopStartInput = () => {
  isEditingStart.value = false
  if (!duration.value) return
  
  const time = parseTimeInput(loopStartInput.value)
  
  if (time === null) {
    // Invalid input, revert to current loop start
    if (loopStart.value !== null) {
      loopStartInput.value = formatTime(loopStart.value)
    } else {
      loopStartInput.value = ''
    }
    return
  }
  
  // Ensure time is within bounds
  const validTime = Math.max(0, Math.min(time, duration.value))
  
  // If loop end exists and is before new start, clear it
  if (loopEnd.value !== null && loopEnd.value <= validTime) {
    alert('Loop start must be before loop end.')
    loopStartInput.value = loopStart.value !== null ? formatTime(loopStart.value) : ''
    return
  }
  
  loopStart.value = validTime
  loopStartInput.value = formatTime(validTime)
}

const applyLoopEndInput = () => {
  isEditingEnd.value = false
  if (!duration.value) return
  
  const time = parseTimeInput(loopEndInput.value)
  
  if (time === null) {
    // Invalid input, revert to current loop end
    if (loopEnd.value !== null) {
      loopEndInput.value = formatTime(loopEnd.value)
    } else {
      loopEndInput.value = ''
    }
    return
  }
  
  // Ensure time is within bounds
  const validTime = Math.max(0, Math.min(time, duration.value))
  
  // Loop end must be after loop start
  if (loopStart.value !== null && validTime <= loopStart.value) {
    alert('Loop end must be after loop start.')
    loopEndInput.value = loopEnd.value !== null ? formatTime(loopEnd.value) : ''
    return
  }
  
  loopEnd.value = validTime
  loopEndInput.value = formatTime(validTime)
}

const incrementLoopStart = () => {
  if (loopStart.value === null || !duration.value) return
  
  const newTime = Math.min(loopStart.value + 1, loopEnd.value !== null ? loopEnd.value - 0.1 : duration.value)
  loopStart.value = Math.max(0, newTime)
  loopStartInput.value = formatTime(loopStart.value)
}

const decrementLoopStart = () => {
  if (loopStart.value === null || loopStart.value <= 0) return
  
  loopStart.value = Math.max(0, loopStart.value - 1)
  loopStartInput.value = formatTime(loopStart.value)
}

const incrementLoopEnd = () => {
  if (loopEnd.value === null || !duration.value) return
  
  const maxTime = Math.min(duration.value, duration.value)
  if (loopEnd.value >= maxTime - 0.1) return
  
  loopEnd.value = Math.min(loopEnd.value + 1, maxTime)
  loopEndInput.value = formatTime(loopEnd.value)
}

const decrementLoopEnd = () => {
  if (loopEnd.value === null) return
  
  const minTime = loopStart.value !== null ? loopStart.value + 0.1 : 0
  if (loopEnd.value <= minTime) return
  
  loopEnd.value = Math.max(minTime, loopEnd.value - 1)
  loopEndInput.value = formatTime(loopEnd.value)
}

const isLoopValid = computed(() => {
  return loopStart.value !== null && loopEnd.value !== null && loopEnd.value > loopStart.value
})

const getTimeFromPosition = (clientX) => {
  if (!progressWrapper.value || !duration.value) return null
  
  const rect = progressWrapper.value.getBoundingClientRect()
  const x = clientX - rect.left
  const percentage = Math.max(0, Math.min(1, x / rect.width))
  return percentage * duration.value
}

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
  if (!draggingMarker.value || !duration.value) return
  
  const time = getTimeFromPosition(clientX)
  if (time === null) return
  
  if (draggingMarker.value === 'start') {
    const newStart = Math.max(0, Math.min(time, loopEnd.value !== null ? loopEnd.value - 0.1 : duration.value))
    loopStart.value = newStart
    // Input will be updated by watcher
  } else if (draggingMarker.value === 'end') {
    const newEnd = Math.max(loopStart.value !== null ? loopStart.value + 0.1 : 0, Math.min(time, duration.value))
    loopEnd.value = newEnd
    // Input will be updated by watcher
  }
}

const handleMarkerMouseDown = (event) => {
  // Allow clicking on the progress bar to set markers when not dragging
  if (!draggingMarker.value && event.target === progressWrapper.value) {
    const time = getTimeFromPosition(event.clientX)
    if (time !== null) {
      // Set marker based on which one is closer
      if (loopStart.value !== null && loopEnd.value !== null) {
        const distToStart = Math.abs(time - loopStart.value)
        const distToEnd = Math.abs(time - loopEnd.value)
        if (distToStart < distToEnd && time < loopEnd.value) {
          loopStart.value = Math.max(0, Math.min(time, loopEnd.value - 0.1))
        } else if (time > loopStart.value) {
          loopEnd.value = Math.max(loopStart.value + 0.1, Math.min(time, duration.value))
        }
      }
    }
  }
}

const handleMarkerTouchStart = (event) => {
  // Similar to mouse down but for touch
  if (!draggingMarker.value && event.target === progressWrapper.value && event.touches.length > 0) {
    const time = getTimeFromPosition(event.touches[0].clientX)
    if (time !== null) {
      if (loopStart.value !== null && loopEnd.value !== null) {
        const distToStart = Math.abs(time - loopStart.value)
        const distToEnd = Math.abs(time - loopEnd.value)
        if (distToStart < distToEnd && time < loopEnd.value) {
          loopStart.value = Math.max(0, Math.min(time, loopEnd.value - 0.1))
        } else if (time > loopStart.value) {
          loopEnd.value = Math.max(loopStart.value + 0.1, Math.min(time, duration.value))
        }
      }
    }
  }
}

// Update input values when loop points change (from dragging or other methods)
// But only if user is not actively editing the input
watch([loopStart, duration], () => {
  if (!isEditingStart.value) {
    if (loopStart.value !== null) {
      loopStartInput.value = formatTime(loopStart.value)
    } else {
      loopStartInput.value = ''
    }
  }
})

watch([loopEnd, duration], () => {
  if (!isEditingEnd.value) {
    if (loopEnd.value !== null) {
      loopEndInput.value = formatTime(loopEnd.value)
    } else {
      loopEndInput.value = ''
    }
  }
})

// Reset player when file changes
watch(() => props.file, () => {
  isPlaying.value = false
  currentSpeed.value = 1
  customSpeed.value = 1
  currentTime.value = 0
  volume.value = 100
  loopStart.value = null
  loopEnd.value = null
  loopEnabled.value = false
  draggingMarker.value = null
  lastLoopJump.value = 0
  loopStartInput.value = ''
  loopEndInput.value = ''
  isEditingStart.value = false
  isEditingEnd.value = false
  
  // Clean up event listeners
  stopDrag()
  
  if (audioPlayer.value) {
    audioPlayer.value.playbackRate = 1
    audioPlayer.value.volume = 1
  }
})

// Clean up on unmount
onUnmounted(() => {
  stopDrag()
})

// Disable loop if it becomes invalid
watch([loopStart, loopEnd], () => {
  if (!isLoopValid.value) {
    loopEnabled.value = false
  }
})

onMounted(() => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = 1
  }
})
</script>

<style scoped>
.player-section {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.player-controls {
  background: #f8f9ff;
  padding: 30px;
  border-radius: 15px;
  margin-bottom: 30px;
}

.btn-control {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 30px;
  transition: all 0.3s ease;
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-control:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
}

.btn-control:active {
  transform: scale(0.95);
}

.play-icon,
.pause-icon {
  width: 32px;
  height: 32px;
  color: white;
}

.progress-container {
  margin-bottom: 20px;
}

.progress-wrapper {
  position: relative;
  width: 100%;
}

.time-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.9em;
  color: #666;
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.3s ease;
}

.progress-bar::-webkit-slider-thumb:hover {
  background: #764ba2;
  transform: scale(1.2);
}

.progress-bar::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.progress-bar::-moz-range-thumb:hover {
  background: #764ba2;
  transform: scale(1.2);
}

.loop-markers {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 8px;
  pointer-events: auto;
  cursor: pointer;
}

.loop-marker {
  position: absolute;
  top: -4px;
  width: 12px;
  height: 16px;
  background: #ff6b6b;
  border-radius: 6px;
  transform: translateX(-50%);
  z-index: 3;
  cursor: grab;
  pointer-events: auto;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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

.loop-start {
  background: #51cf66;
}

.loop-start:hover {
  background: #40c057;
}

.loop-end:hover {
  background: #ff5252;
}

.loop-range {
  position: absolute;
  top: 0;
  height: 8px;
  background: rgba(102, 126, 234, 0.2);
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

.volume-control {
  display: flex;
  align-items: center;
  gap: 15px;
  justify-content: center;
}

.volume-icon {
  width: 24px;
  height: 24px;
  color: #667eea;
}

.volume-slider {
  width: 150px;
  height: 6px;
  border-radius: 5px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
}

.volume-control span {
  min-width: 45px;
  font-weight: 600;
  color: #667eea;
  font-size: 0.9em;
}

.speed-controls {
  background: #f8f9ff;
  padding: 30px;
  border-radius: 15px;
}

.speed-controls h3 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
  font-size: 1.5em;
}

.speed-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 25px;
}

.speed-btn {
  background: white;
  border: 2px solid #667eea;
  color: #667eea;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 70px;
}

.speed-btn:hover {
  background: #f0f2ff;
  transform: translateY(-2px);
}

.speed-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #764ba2;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.custom-speed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.custom-speed label {
  font-weight: 600;
  color: #333;
}

.custom-speed input {
  padding: 10px 15px;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 1em;
  width: 100px;
  text-align: center;
}

.custom-speed input:focus {
  outline: none;
  border-color: #764ba2;
}

.btn-apply {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-apply:hover {
  background: #764ba2;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.current-speed-display {
  text-align: center;
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
  padding-top: 15px;
  border-top: 2px solid #e0e0e0;
}

.current-speed-display span {
  color: #667eea;
  font-size: 1.2em;
}

.loop-controls {
  background: #f8f9ff;
  padding: 30px;
  border-radius: 15px;
  margin-bottom: 30px;
}

.loop-controls h3 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
  font-size: 1.5em;
}

.loop-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 25px;
}

.loop-time-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  margin-bottom: 25px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.time-input-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.9em;
}

.time-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
}

.time-input {
  padding: 10px 40px 10px 15px;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 1em;
  width: 120px;
  text-align: center;
  font-weight: 600;
  color: white;
  background: #667eea;
  transition: all 0.3s ease;
}

.time-input:focus {
  outline: none;
  border-color: #764ba2;
  background: #764ba2;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.time-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
  font-weight: normal;
}

.time-input-buttons {
  position: absolute;
  right: 5px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s ease;
  border-radius: 3px;
  width: 24px;
  height: 14px;
}

.time-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.time-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.time-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.time-btn svg {
  width: 12px;
  height: 12px;
}

.time-btn-up {
  padding-bottom: 1px;
}

.time-btn-down {
  padding-top: 1px;
}

.loop-btn {
  background: white;
  border: 2px solid #667eea;
  color: #667eea;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 140px;
}

.loop-btn:hover {
  background: #f0f2ff;
  transform: translateY(-2px);
}

.loop-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #764ba2;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.loop-btn.loop-clear {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.loop-btn.loop-clear:hover {
  background: #fff5f5;
}

.loop-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.loop-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.loop-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  background-color: #ccc;
  border-radius: 34px;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.loop-switch input:checked + .slider {
  background-color: #667eea;
}

.loop-switch input:checked + .slider:before {
  transform: translateX(26px);
}

.loop-switch input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.label-text {
  font-weight: 600;
  color: #333;
  font-size: 1em;
}

.loop-warning {
  font-size: 0.85em;
  color: #ff6b6b;
  font-weight: 600;
  text-align: center;
}

@media (max-width: 600px) {
  .speed-buttons {
    gap: 8px;
  }

  .speed-btn {
    padding: 10px 16px;
    min-width: 60px;
    font-size: 0.9em;
  }

  .custom-speed {
    flex-direction: column;
  }

  .loop-buttons {
    flex-direction: column;
  }

  .loop-btn {
    width: 100%;
  }

  .loop-time-inputs {
    flex-direction: column;
    gap: 15px;
  }

  .time-input-group {
    width: 100%;
  }

  .time-input-wrapper {
    width: 100%;
  }

  .time-input {
    width: 100%;
  }
}
</style>
