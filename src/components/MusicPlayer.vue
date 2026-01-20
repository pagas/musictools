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
        <div class="note-display" v-if="isNoteDetectionActive || detectedNote">
          <span class="note-label">Note:</span>
          <span class="note-status" :class="{ active: isNoteDetectionActive, inactive: !isNoteDetectionActive }">
            <span class="status-dot"></span>
            {{ isNoteDetectionActive ? 'Active' : 'Inactive' }}
          </span>
          <span class="note-value" v-if="detectedNote">{{ detectedNote }}</span>
          <span class="note-frequency" v-if="detectedFrequency">({{ detectedFrequency.toFixed(1) }} Hz)</span>
          <span class="note-placeholder" v-if="isNoteDetectionActive && !detectedNote">No note detected</span>
        </div>
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
          <label for="loopStartInput">Loop Start (MM:SS or MM:SS.ms):</label>
          <div class="time-input-wrapper">
            <input
              id="loopStartInput"
              type="text"
              class="time-input"
              :value="loopStartInput"
              @input="handleLoopStartInput"
              @blur="applyLoopStartInput"
              @keypress.enter="applyLoopStartInput"
              placeholder="0:00.0"
            />
            <div class="time-input-buttons">
              <div class="time-btn-group">
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
              <div class="time-btn-group time-btn-group-ms">
                <button 
                  type="button" 
                  class="time-btn time-btn-up time-btn-ms" 
                  @click="incrementLoopStartMs"
                  :disabled="loopStart === null || duration === 0"
                  title="Increase by 100 milliseconds"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </button>
                <button 
                  type="button" 
                  class="time-btn time-btn-down time-btn-ms" 
                  @click="decrementLoopStartMs"
                  :disabled="loopStart === null || loopStart <= 0"
                  title="Decrease by 100 milliseconds"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="time-input-group">
          <label for="loopEndInput">Loop End (MM:SS or MM:SS.ms):</label>
          <div class="time-input-wrapper">
            <input
              id="loopEndInput"
              type="text"
              class="time-input"
              :value="loopEndInput"
              @input="handleLoopEndInput"
              @blur="applyLoopEndInput"
              @keypress.enter="applyLoopEndInput"
              placeholder="0:00.0"
            />
            <div class="time-input-buttons">
              <div class="time-btn-group">
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
              <div class="time-btn-group time-btn-group-ms">
                <button 
                  type="button" 
                  class="time-btn time-btn-up time-btn-ms" 
                  @click="incrementLoopEndMs"
                  :disabled="loopEnd === null || loopEnd >= duration || (loopStart !== null && loopEnd >= duration - 0.001)"
                  title="Increase by 100 milliseconds"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </button>
                <button 
                  type="button" 
                  class="time-btn time-btn-down time-btn-ms" 
                  @click="decrementLoopEndMs"
                  :disabled="loopEnd === null || (loopStart !== null && loopEnd <= loopStart + 0.001)"
                  title="Decrease by 100 milliseconds"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
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
const waveformCanvas = ref(null)
const audioContext = ref(null)
const waveformData = ref(null)
const zoomLevel = ref(1)
const zoomOffset = ref(0)
const isClick = ref(false)
const clickStartTime = ref(0)
const analyser = ref(null)
const sourceNode = ref(null)
const dataArray = ref(null)
const animationFrameId = ref(null)
const detectedNote = ref('')
const detectedFrequency = ref(0)

// Track if note detection should be active (reactive flag)
const noteDetectionActive = ref(false)

// Computed property to check if note detection is currently active
const isNoteDetectionActive = computed(() => {
  return noteDetectionActive.value && 
         !!audioPlayer.value && 
         !audioPlayer.value.paused && 
         !!analyser.value
})

const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

const audioUrl = computed(() => {
  return URL.createObjectURL(props.file)
})

// Computed properties for loop marker positions accounting for zoom
const visibleStartTime = computed(() => {
  if (!duration.value) return 0
  const visDur = duration.value / zoomLevel.value
  const maxOffset = Math.max(0, duration.value - visDur)
  return Math.max(0, Math.min(maxOffset, zoomOffset.value))
})

const visibleEndTime = computed(() => {
  if (!duration.value) return 0
  const visDur = duration.value / zoomLevel.value
  return visibleStartTime.value + visDur
})

const visibleDurationTime = computed(() => {
  if (!duration.value) return 0
  return duration.value / zoomLevel.value
})

const loopStartPosition = computed(() => {
  if (loopStart.value === null || !duration.value) return '0%'
  
  const start = loopStart.value
  const visStart = visibleStartTime.value
  const visEnd = visibleEndTime.value
  const visDur = visibleDurationTime.value
  
  if (start < visStart) {
    // Before visible area - show at left edge
    return '-6px'
  } else if (start > visEnd) {
    // After visible area - show at right edge
    return 'calc(100% + 6px)'
  } else {
    // Within visible area - calculate position
    const position = ((start - visStart) / visDur) * 100
    return `${position}%`
  }
})

const loopEndPosition = computed(() => {
  if (loopEnd.value === null || !duration.value) return '0%'
  
  const end = loopEnd.value
  const visStart = visibleStartTime.value
  const visEnd = visibleEndTime.value
  const visDur = visibleDurationTime.value
  
  if (end < visStart) {
    // Before visible area - show at left edge
    return '-6px'
  } else if (end > visEnd) {
    // After visible area - show at right edge
    return 'calc(100% + 6px)'
  } else {
    // Within visible area - calculate position
    const position = ((end - visStart) / visDur) * 100
    return `${position}%`
  }
})

const loopRangeStyle = computed(() => {
  if (loopStart.value === null || loopEnd.value === null || !duration.value) {
    return { left: '0%', width: '0%' }
  }
  
  const start = loopStart.value
  const end = loopEnd.value
  const visStart = visibleStartTime.value
  const visEnd = visibleEndTime.value
  const visDur = visibleDurationTime.value
  
  // Calculate the visible portion of the loop range
  const rangeStart = Math.max(start, visStart)
  const rangeEnd = Math.min(end, visEnd)
  
  if (rangeEnd <= rangeStart) {
    // Loop range is outside visible area
    return { left: '0%', width: '0%' }
  }
  
  const left = ((rangeStart - visStart) / visDur) * 100
  const width = ((rangeEnd - rangeStart) / visDur) * 100
  
  return {
    left: `${Math.max(0, left)}%`,
    width: `${Math.min(100, width)}%`
  }
})

// Scrollbar computed properties
const scrollbarMax = computed(() => {
  if (!duration.value || zoomLevel.value <= 1) return 0
  const visibleDuration = duration.value / zoomLevel.value
  const maxOffset = Math.max(0, duration.value - visibleDuration)
  // Return max offset in steps (using 1000 steps for smooth scrolling)
  return Math.max(0, Math.floor(maxOffset * 1000))
})

const scrollbarValue = computed(() => {
  if (!duration.value || zoomLevel.value <= 1) return 0
  return Math.floor(zoomOffset.value * 1000)
})

// Handle scrollbar input
const handleScrollbarInput = (event) => {
  if (!duration.value || zoomLevel.value <= 1) return
  
  const value = parseFloat(event.target.value) / 1000 // Convert back to seconds
  const visibleDuration = duration.value / zoomLevel.value
  const maxOffset = Math.max(0, duration.value - visibleDuration)
  
  zoomOffset.value = Math.max(0, Math.min(maxOffset, value))
  drawWaveform()
}

// Initialize audio context for waveform preprocessing and note detection
const initAudioContext = () => {
  if (!audioPlayer.value) return
  
  try {
    // Create audio context for decoding and real-time analysis
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    audioContext.value = new AudioContextClass()
    
    // Pre-process waveform data when metadata is loaded
    preprocessWaveform()
    
    // Set up analyser for real-time note detection
    setupAudioAnalysis()
  } catch (error) {
    console.error('Error initializing audio context:', error)
  }
}

// Set up audio analysis for real-time note detection
const setupAudioAnalysis = () => {
  if (!audioPlayer.value || !audioContext.value) return
  
  try {
    // Create analyser node
    analyser.value = audioContext.value.createAnalyser()
    analyser.value.fftSize = 8192 // Higher resolution for better pitch detection
    analyser.value.smoothingTimeConstant = 0.3
    
    // Create buffer for frequency data (for FFT-based detection)
    const bufferLength = analyser.value.frequencyBinCount
    dataArray.value = new Uint8Array(bufferLength) // Used for frequency data now
    
    // Create source node from audio element
    // Note: createMediaElementSource automatically disconnects the audio element
    // from its default destination, so we need to connect through analyser to destination
    if (sourceNode.value) {
      sourceNode.value.disconnect()
    }
    sourceNode.value = audioContext.value.createMediaElementSource(audioPlayer.value)
    sourceNode.value.connect(analyser.value)
    // Connect analyser to destination so audio still plays
    analyser.value.connect(audioContext.value.destination)
    
    // Start note detection if playing
    if (!audioPlayer.value.paused) {
      // Resume audio context if suspended
      if (audioContext.value.state === 'suspended') {
        audioContext.value.resume()
      }
      startNoteDetection()
    }
  } catch (error) {
    console.error('Error setting up audio analysis:', error)
  }
}

// Convert frequency to musical note name
const frequencyToNote = (frequency) => {
  if (!frequency || frequency < 20 || frequency > 20000) {
    return null
  }
  
  // A4 = 440 Hz
  const A4 = 440
  const semitonesFromA4 = 12 * Math.log2(frequency / A4)
  const noteNumber = Math.round(semitonesFromA4) + 69 // MIDI note number (A4 = 69)
  
  // Ensure note number is in valid range (MIDI 0-127)
  const clampedNoteNumber = Math.max(0, Math.min(127, noteNumber))
  
  // Calculate octave and note name
  const octave = Math.floor((clampedNoteNumber - 12) / 12)
  const noteIndex = clampedNoteNumber % 12
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const noteName = noteNames[noteIndex]
  
  return `${noteName}${octave}`
}

// Detect pitch using FFT-based frequency analysis
const detectPitch = () => {
  if (!analyser.value || !dataArray.value || !audioContext.value) return null
  
  // Get frequency data instead of time domain
  const frequencyData = new Uint8Array(analyser.value.frequencyBinCount)
  analyser.value.getByteFrequencyData(frequencyData)
  
  const sampleRate = audioContext.value.sampleRate
  const bufferLength = frequencyData.length
  const nyquist = sampleRate / 2
  const binSize = nyquist / bufferLength
  
  // Find the peak frequency (fundamental)
  let maxMagnitude = 0
  let peakBin = 0
  
  // Search in musical frequency range (80 Hz to 2000 Hz)
  const minBin = Math.floor(80 / binSize)
  const maxBin = Math.min(Math.floor(2000 / binSize), bufferLength - 1)
  
  for (let i = minBin; i <= maxBin; i++) {
    if (frequencyData[i] > maxMagnitude) {
      maxMagnitude = frequencyData[i]
      peakBin = i
    }
  }
  
  // Check if signal is strong enough (threshold: at least 30% of max)
  // This helps filter out noise
  if (maxMagnitude < 50) { // Minimum threshold (0-255 scale)
    return null
  }
  
  // Calculate frequency from bin
  const frequency = peakBin * binSize
  
  // Try to find the fundamental frequency by looking for harmonics
  // Check if there's a lower frequency that's a divisor of the peak
  let fundamentalFrequency = frequency
  let bestScore = 0
  
  // Check potential fundamentals (divide by common harmonics: 2, 3, 4, 5)
  for (let divisor = 1; divisor <= 5; divisor++) {
    const candidateFreq = frequency / divisor
    
    // Make sure candidate is in valid range
    if (candidateFreq < 80 || candidateFreq > 2000) continue
    
    const candidateBin = Math.floor(candidateFreq / binSize)
    if (candidateBin >= 0 && candidateBin < bufferLength) {
      // Score based on magnitude and how well it divides
      const magnitude = frequencyData[candidateBin]
      const score = magnitude / divisor // Penalize higher harmonics
      
      if (score > bestScore && magnitude > 40) {
        bestScore = score
        fundamentalFrequency = candidateFreq
      }
    }
  }
  
  return fundamentalFrequency
}

// Start note detection loop
const startNoteDetection = () => {
  if (!audioPlayer.value || audioPlayer.value.paused || !analyser.value) {
    noteDetectionActive.value = false
    return
  }
  
  // Set flag to active
  noteDetectionActive.value = true
  
  const detect = () => {
    if (!audioPlayer.value || audioPlayer.value.paused) {
      noteDetectionActive.value = false
      detectedNote.value = ''
      detectedFrequency.value = 0
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value)
        animationFrameId.value = null
      }
      return
    }
    
    const frequency = detectPitch()
    if (frequency && frequency >= 80 && frequency <= 2000) {
      detectedFrequency.value = frequency
      const note = frequencyToNote(frequency)
      detectedNote.value = note || ''
    } else {
      // Keep previous values for a short time to avoid flickering
      // Only clear if we consistently get no signal
      detectedNote.value = ''
      detectedFrequency.value = 0
    }
    
    animationFrameId.value = requestAnimationFrame(detect)
  }
  
  detect()
}

// Stop note detection
const stopNoteDetection = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
  detectedNote.value = ''
  detectedFrequency.value = 0
}

// Pre-process waveform data for visualization
const preprocessWaveform = async () => {
  if (!audioPlayer.value || !duration.value) return
  
  try {
    // Decode audio file to get raw audio data
    const arrayBuffer = await props.file.arrayBuffer()
    const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
    
    // Get channel data (use first channel)
    const rawData = audioBuffer.getChannelData(0)
    const samples = 500 // Number of sample points for waveform
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData = []
    
    // Downsample and get peak values
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j])
      }
      filteredData.push(sum / blockSize)
    }
    
    // Normalize
    const max = Math.max(...filteredData)
    waveformData.value = filteredData.map(n => n / max)
    
    // Draw initial waveform
    drawWaveform()
  } catch (error) {
    console.error('Error preprocessing waveform:', error)
  }
}

// Draw waveform on canvas with zoom support
const drawWaveform = () => {
  if (!waveformCanvas.value || !duration.value) return
  
  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width = canvas.offsetWidth
  const height = canvas.height = canvas.offsetHeight
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)
  
  // Draw background
  ctx.fillStyle = '#f0f2ff'
  ctx.fillRect(0, 0, width, height)
  
  // Calculate visible range based on zoom
  const visibleDuration = duration.value / zoomLevel.value
  const maxOffset = Math.max(0, duration.value - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffset.value))
  const visibleStart = clampedOffset
  const visibleEnd = clampedOffset + visibleDuration
  
  // Calculate scaling factors
  const timeToPixel = width / visibleDuration
  const pixelToTime = visibleDuration / width
  
  // Draw waveform if data is available
  if (waveformData.value && waveformData.value.length > 0) {
    const centerY = height / 2
    const sampleDuration = duration.value / waveformData.value.length
    
    ctx.fillStyle = '#667eea'
    ctx.strokeStyle = '#667eea'
    ctx.lineWidth = 1
    
    // Calculate which samples to draw
    const startSample = Math.floor(visibleStart / sampleDuration)
    const endSample = Math.ceil(visibleEnd / sampleDuration)
    const samplesToDraw = endSample - startSample
    
    if (samplesToDraw > 0) {
      const barWidth = width / samplesToDraw
      
      for (let i = startSample; i < endSample && i < waveformData.value.length; i++) {
        const value = waveformData.value[i]
        const barHeight = value * centerY * 0.8
        const sampleTime = i * sampleDuration
        const x = (sampleTime - visibleStart) * timeToPixel
        
        // Draw vertical line (waveform bar)
        if (x >= -barWidth && x <= width + barWidth) {
          ctx.beginPath()
          ctx.moveTo(x, centerY - barHeight)
          ctx.lineTo(x, centerY + barHeight)
          ctx.stroke()
        }
      }
    }
  }
  
  // Draw progress indicator
  if (currentTime.value > 0 && duration.value > 0) {
    const progress = currentTime.value / duration.value
    let progressX = 0
    
    if (currentTime.value >= visibleStart && currentTime.value <= visibleEnd) {
      progressX = (currentTime.value - visibleStart) * timeToPixel
    } else if (currentTime.value < visibleStart) {
      progressX = 0
    } else {
      progressX = width
    }
    
    ctx.fillStyle = 'rgba(118, 75, 162, 0.3)'
    ctx.fillRect(0, 0, Math.max(0, progressX), height)
    
    // Draw progress line
    if (progressX >= 0 && progressX <= width) {
      ctx.strokeStyle = '#764ba2'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()
    }
  }
  
  // Draw loop markers
  if (loopStart.value !== null && duration.value > 0) {
    let startX = 0
    if (loopStart.value >= visibleStart && loopStart.value <= visibleEnd) {
      startX = (loopStart.value - visibleStart) * timeToPixel
    } else if (loopStart.value < visibleStart) {
      startX = -5 // Show as a small indicator on the left
    } else {
      startX = width + 5 // Show as a small indicator on the right
    }
    
    if (startX >= -10 && startX <= width + 10) {
      ctx.strokeStyle = '#51cf66'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, height)
      ctx.stroke()
    }
  }
  
  if (loopEnd.value !== null && duration.value > 0) {
    let endX = 0
    if (loopEnd.value >= visibleStart && loopEnd.value <= visibleEnd) {
      endX = (loopEnd.value - visibleStart) * timeToPixel
    } else if (loopEnd.value < visibleStart) {
      endX = -5
    } else {
      endX = width + 5
    }
    
    if (endX >= -10 && endX <= width + 10) {
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, height)
      ctx.stroke()
    }
  }
  
  // Draw loop range highlight
  if (loopStart.value !== null && loopEnd.value !== null && duration.value > 0) {
    const startX = Math.max(0, (loopStart.value - visibleStart) * timeToPixel)
    const endX = Math.min(width, (loopEnd.value - visibleStart) * timeToPixel)
    
    if (endX > startX) {
      ctx.fillStyle = 'rgba(102, 126, 234, 0.2)'
      ctx.fillRect(startX, 0, endX - startX, height)
    }
  }
}


// Handle canvas click - seek to clicked position
const handleCanvasClick = (event) => {
  // Only process clicks (not drags)
  if (!isClick.value) return
  
  if (!waveformCanvas.value || !duration.value) return
  
  const canvas = waveformCanvas.value
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  
  // Calculate time based on zoom and offset
  const visibleDuration = duration.value / zoomLevel.value
  const maxOffset = Math.max(0, duration.value - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffset.value))
  const pixelToTime = visibleDuration / rect.width
  const clickTime = clampedOffset + (x * pixelToTime)
  const validTime = Math.max(0, Math.min(duration.value, clickTime))
  
  // Seek to clicked position
  if (audioPlayer.value) {
    audioPlayer.value.currentTime = validTime
  }
}

// Handle mouse down on canvas
const handleCanvasMouseDown = (event) => {
  if (!waveformCanvas.value || !duration.value) return
  
  // Don't interfere if dragging a marker
  if (draggingMarker.value) return
  
  // Initialize click tracking
  isClick.value = true
  clickStartTime.value = Date.now()
  
  // Just prevent default to avoid text selection
  event.preventDefault()
}

// Handle mouse move on canvas
const handleCanvasMouseMove = (event) => {
  if (!waveformCanvas.value || !duration.value) return
  
  // Don't interfere if dragging a marker
  if (draggingMarker.value) return
  
  // Check if mouse has moved significantly (more than 3px) - it's a drag, not a click
  if (isClick.value && clickStartTime.value > 0) {
    // Get the canvas rect to calculate relative position
    const rect = waveformCanvas.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const startX = event.clientX // Use absolute position for delta check
    
    // We need to track the initial mouse position, but for simplicity,
    // we'll just check if enough time has passed and movement occurred
    const timeSinceStart = Date.now() - clickStartTime.value
    if (timeSinceStart > 200) {
      // If significant time passed, consider it might be a drag
      // But for simplicity, we'll allow clicks even with movement
      // The click handler will check isClick.value
    }
  }
  
  // Always show pointer cursor for clicking/seeking
  if (!draggingMarker.value) {
    waveformCanvas.value.style.cursor = 'pointer'
  }
}

// Handle mouse up on canvas
const handleCanvasMouseUp = () => {
  // Reset click flag after a short delay to allow click handler to fire
  setTimeout(() => {
    isClick.value = false
  }, 50)
}

// Zoom functions
const zoomIn = () => {
  if (zoomLevel.value >= 10) return
  
  const oldZoom = zoomLevel.value
  zoomLevel.value = Math.min(10, zoomLevel.value * 1.5)
  
  // Adjust offset to keep center point stable
  const zoomChange = zoomLevel.value / oldZoom
  const centerTime = zoomOffset.value + (duration.value / oldZoom / 2)
  const newVisibleDuration = duration.value / zoomLevel.value
  zoomOffset.value = Math.max(0, Math.min(
    duration.value - newVisibleDuration,
    centerTime - newVisibleDuration / 2
  ))
  
  drawWaveform()
}

const zoomOut = () => {
  if (zoomLevel.value <= 1) {
    resetZoom()
    return
  }
  
  const oldZoom = zoomLevel.value
  zoomLevel.value = Math.max(1, zoomLevel.value / 1.5)
  
  // Adjust offset to keep center point stable
  const zoomChange = zoomLevel.value / oldZoom
  const centerTime = zoomOffset.value + (duration.value / oldZoom / 2)
  const newVisibleDuration = duration.value / zoomLevel.value
  zoomOffset.value = Math.max(0, Math.min(
    duration.value - newVisibleDuration,
    centerTime - newVisibleDuration / 2
  ))
  
  // If fully zoomed out, reset offset
  if (zoomLevel.value === 1) {
    zoomOffset.value = 0
  }
  
  drawWaveform()
}

const resetZoom = () => {
  zoomLevel.value = 1
  zoomOffset.value = 0
  drawWaveform()
}

const zoomToLoop = () => {
  if (loopStart.value === null || loopEnd.value === null || !duration.value) return
  
  const loopDuration = loopEnd.value - loopStart.value
  const centerTime = (loopStart.value + loopEnd.value) / 2
  
  // Calculate zoom level to fit loop with some padding
  const padding = loopDuration * 0.2 // 20% padding
  const targetVisibleDuration = loopDuration + padding
  zoomLevel.value = Math.min(10, Math.max(1, duration.value / targetVisibleDuration))
  
  // Center on loop
  const newVisibleDuration = duration.value / zoomLevel.value
  zoomOffset.value = Math.max(0, Math.min(
    duration.value - newVisibleDuration,
    centerTime - newVisibleDuration / 2
  ))
  
  drawWaveform()
}

const handleWheelZoom = (event) => {
  if (!waveformCanvas.value || !duration.value) return
  
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  
  if (delta > 1 && zoomLevel.value >= 10) return
  if (delta < 1 && zoomLevel.value <= 1) {
    if (zoomOffset.value === 0) return
  }
  
  const oldZoom = zoomLevel.value
  zoomLevel.value = Math.max(1, Math.min(10, zoomLevel.value * delta))
  
  // If zooming in, adjust offset to zoom towards mouse position
  if (delta > 1) {
    const rect = waveformCanvas.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseTime = zoomOffset.value + (mouseX / rect.width) * (duration.value / oldZoom)
    
    const newVisibleDuration = duration.value / zoomLevel.value
    const maxOffset = Math.max(0, duration.value - newVisibleDuration)
    zoomOffset.value = Math.max(0, Math.min(maxOffset, mouseTime - (mouseX / rect.width) * newVisibleDuration))
  } else {
    // Zooming out - keep center stable
    const centerTime = zoomOffset.value + (duration.value / oldZoom / 2)
    const newVisibleDuration = duration.value / zoomLevel.value
    zoomOffset.value = Math.max(0, Math.min(
      duration.value - newVisibleDuration,
      centerTime - newVisibleDuration / 2
    ))
  }
  
  // Reset if fully zoomed out
  if (zoomLevel.value === 1) {
    zoomOffset.value = 0
  }
  
  drawWaveform()
}

const togglePlayPause = () => {
  if (audioPlayer.value.paused) {
    audioPlayer.value.play()
    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext.value && audioContext.value.state === 'suspended') {
      audioContext.value.resume()
    }
    // Start note detection if analyser is set up
    if (analyser.value) {
      startNoteDetection()
    }
  } else {
    audioPlayer.value.pause()
    stopNoteDetection()
  }
}

const handleLoadedMetadata = () => {
  duration.value = audioPlayer.value.duration
  // Initialize audio context and waveform after metadata is loaded
  if (audioContext.value === null) {
    initAudioContext()
  } else {
    preprocessWaveform()
    // Set up analysis if not already done
    if (!analyser.value) {
      setupAudioAnalysis()
    }
  }
}

const updateProgress = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime
    
    // Update waveform progress (static visualization only)
    drawWaveform()
    
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


const updateVolume = (event) => {
  const newVolume = parseInt(event.target.value)
  volume.value = newVolume
  if (audioPlayer.value) {
    audioPlayer.value.volume = newVolume / 100
  }
}

const handleEnded = () => {
  // Stop note detection when audio ends
  stopNoteDetection()
  
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
            // Restart note detection after looping
            if (analyser.value) {
              startNoteDetection()
            }
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
  if (isNaN(seconds)) return '0:00.0'
  const totalSeconds = Math.floor(seconds)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  const ms = Math.floor((seconds % 1) * 1000)
  
  // Always show milliseconds (as tenths of a second, 0-9)
  const msTenths = Math.floor(ms / 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${msTenths}`
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

// Parse time input (supports MM:SS, MM:SS.m, MM:SS.ms format or plain seconds)
const parseTimeInput = (input) => {
  if (!input || input.trim() === '') return null
  
  const trimmed = input.trim()
  
  // Check if it's in MM:SS.ms format (with milliseconds)
  const timeMatchMs = trimmed.match(/^(\d+):(\d{2})\.(\d{1,3})$/)
  if (timeMatchMs) {
    const minutes = parseInt(timeMatchMs[1], 10)
    const seconds = parseInt(timeMatchMs[2], 10)
    const milliseconds = parseInt(timeMatchMs[3], 10)
    if (seconds >= 0 && seconds < 60 && minutes >= 0 && milliseconds >= 0 && milliseconds < 1000) {
      // Convert milliseconds to decimal seconds
      const msDecimal = milliseconds / 1000
      // Handle cases like "1:23.5" (500ms) vs "1:23.05" (50ms)
      if (timeMatchMs[3].length === 1) {
        return minutes * 60 + seconds + milliseconds / 10
      } else if (timeMatchMs[3].length === 2) {
        return minutes * 60 + seconds + milliseconds / 100
      } else {
        return minutes * 60 + seconds + msDecimal
      }
    }
  }
  
  // Check if it's in MM:SS format (without milliseconds)
  const timeMatch = trimmed.match(/^(\d+):(\d{2})$/)
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10)
    const seconds = parseInt(timeMatch[2], 10)
    if (seconds >= 0 && seconds < 60 && minutes >= 0) {
      return minutes * 60 + seconds
    }
  }
  
  // Try parsing as plain seconds (number) - supports decimals for milliseconds
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

const incrementLoopStartMs = () => {
  if (loopStart.value === null || !duration.value) return
  
  const increment = 0.1 // 100 milliseconds
  const newTime = Math.min(loopStart.value + increment, loopEnd.value !== null ? loopEnd.value - 0.001 : duration.value)
  loopStart.value = Math.max(0, newTime)
  loopStartInput.value = formatTime(loopStart.value)
}

const decrementLoopStartMs = () => {
  if (loopStart.value === null || loopStart.value <= 0) return
  
  const decrement = 0.1 // 100 milliseconds
  loopStart.value = Math.max(0, loopStart.value - decrement)
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

const incrementLoopEndMs = () => {
  if (loopEnd.value === null || !duration.value) return
  
  const increment = 0.1 // 100 milliseconds
  const maxTime = duration.value
  if (loopEnd.value >= maxTime - 0.001) return
  
  loopEnd.value = Math.min(loopEnd.value + increment, maxTime)
  loopEndInput.value = formatTime(loopEnd.value)
}

const decrementLoopEndMs = () => {
  if (loopEnd.value === null) return
  
  const decrement = 0.1 // 100 milliseconds
  const minTime = loopStart.value !== null ? loopStart.value + 0.001 : 0
  if (loopEnd.value <= minTime) return
  
  loopEnd.value = Math.max(minTime, loopEnd.value - decrement)
  loopEndInput.value = formatTime(loopEnd.value)
}

const isLoopValid = computed(() => {
  return loopStart.value !== null && loopEnd.value !== null && loopEnd.value > loopStart.value
})

const getTimeFromPosition = (clientX) => {
  if (!progressWrapper.value || !duration.value) return null
  
  const rect = progressWrapper.value.getBoundingClientRect()
  const x = clientX - rect.left
  const visibleDuration = duration.value / zoomLevel.value
  const maxOffset = Math.max(0, duration.value - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffset.value))
  const pixelToTime = visibleDuration / rect.width
  return clampedOffset + (x * pixelToTime)
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
  if (!draggingMarker.value || !duration.value || !progressWrapper.value) return
  
  // Calculate time accounting for zoom
  const rect = progressWrapper.value.getBoundingClientRect()
  const x = clientX - rect.left
  const visibleDuration = duration.value / zoomLevel.value
  const maxOffset = Math.max(0, duration.value - visibleDuration)
  const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffset.value))
  const pixelToTime = visibleDuration / rect.width
  const time = clampedOffset + (x * pixelToTime)
  
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
}, { immediate: true })

watch([loopEnd, duration], () => {
  if (!isEditingEnd.value) {
    if (loopEnd.value !== null) {
      loopEndInput.value = formatTime(loopEnd.value)
    } else {
      loopEndInput.value = ''
    }
  }
}, { immediate: true })

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
  waveformData.value = null
  
  // Stop note detection
  stopNoteDetection()
  detectedNote.value = ''
  detectedFrequency.value = 0
  
  // Clean up audio nodes
  if (sourceNode.value) {
    sourceNode.value.disconnect()
    sourceNode.value = null
  }
  analyser.value = null
  dataArray.value = null
  
  // Clean up audio context
  if (audioContext.value) {
    audioContext.value.close().catch(() => {})
    audioContext.value = null
  }
  
  // Reset zoom
  zoomLevel.value = 1
  zoomOffset.value = 0
  isClick.value = false
  
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
  stopNoteDetection()
  
  // Clean up audio nodes
  if (sourceNode.value) {
    sourceNode.value.disconnect()
    sourceNode.value = null
  }
  analyser.value = null
  dataArray.value = null
  
  // Clean up audio context
  if (audioContext.value) {
    audioContext.value.close().catch(() => {})
    audioContext.value = null
  }
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
  
  // Draw initial waveform when canvas is ready
  if (waveformCanvas.value) {
    drawWaveform()
  }
  
  // Redraw waveform on window resize
  const handleResize = () => {
    if (waveformCanvas.value) {
      if (isPlaying.value) {
        drawWaveform()
      } else {
        drawWaveform()
      }
    }
  }
  window.addEventListener('resize', handleResize)
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
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


.time-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.9em;
  color: #666;
  font-weight: 600;
}

.note-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  font-size: 0.95em;
  min-height: 32px;
  flex-wrap: wrap;
}

.note-label {
  color: #667eea;
  font-weight: 600;
}

.note-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.note-status.active {
  color: #51cf66;
  background: rgba(81, 207, 102, 0.15);
}

.note-status.inactive {
  color: #999;
  background: rgba(153, 153, 153, 0.1);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  transition: all 0.3s ease;
}

.note-status.active .status-dot {
  background: #51cf66;
  box-shadow: 0 0 6px rgba(81, 207, 102, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

.note-status.inactive .status-dot {
  background: #999;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.note-value {
  color: #333;
  font-weight: 700;
  font-size: 1.1em;
  letter-spacing: 0.5px;
}

.note-frequency {
  color: #666;
  font-size: 0.85em;
  font-weight: 500;
}

.note-placeholder {
  color: #999;
  font-size: 0.9em;
  font-style: italic;
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
  gap: 25px;
  justify-content: center;
  margin-bottom: 25px;
  align-items: flex-start;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  min-width: 200px;
  flex: 1;
}

.time-input-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.8em;
  text-align: center;
  white-space: nowrap;
  line-height: 1.2;
}

.time-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  max-width: 195px;
}

.time-input {
  padding: 10px 115px 10px 18px;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 1.1em;
  width: 100%;
  text-align: center;
  font-weight: 600;
  color: white;
  background: #667eea;
  transition: all 0.3s ease;
  box-sizing: border-box;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  text-overflow: visible;
  overflow: visible;
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
  right: 4px;
  display: flex;
  flex-direction: row;
  gap: 5px;
  align-items: center;
  flex-shrink: 0;
}

.time-btn-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.time-btn-group-ms {
  border-left: 1px solid rgba(255, 255, 255, 0.25);
  padding-left: 5px;
  margin-left: 2px;
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

  .loop-time-inputs {
    gap: 20px;
  }

  .time-input-group {
    min-width: 100%;
    width: 100%;
  }

  .time-input-wrapper {
    width: 100%;
    max-width: 100%;
  }

  .time-input {
    width: 100%;
    min-width: 100%;
    font-size: 1em;
  }

  .time-input-group {
    min-width: 100%;
  }

  .time-input-group label {
    font-size: 0.75em;
  }
}
</style>
