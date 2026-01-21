<template>
  <div class="player-section">
    <audio
      ref="audioPlayer"
      :src="audioUrl"
      preload="metadata"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
    ></audio>

    <div class="player-controls">
      <div class="controls-layout">
        <div class="volume-play-wrapper">
          <button class="play-btn" @click="togglePlayPause">
            <svg v-if="!isPlaying" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          </button>
          <button 
            class="seek-btn seek-start-btn" 
            @click="seekToStart"
            :disabled="!duration || duration === 0"
            title="Go to Start"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>
          <button 
            class="seek-btn seek-end-btn" 
            @click="seekToEnd"
            :disabled="!duration || duration === 0"
            title="Go to End"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </button>
          <VolumeControl
            :volume="volume"
            @update:volume="updateVolume"
          />
        </div>

        <div class="note-display-column">
          <NoteDetector
            :isNoteDetectionActive="isNoteDetectionActive"
            :detectedNote="detectedNote"
            :detectedFrequency="detectedFrequency"
            :currentTime="currentTime"
          />
        </div>
      </div>

      <PlaybackControls
        :currentTime="currentTime"
        :duration="duration"
      />
      
      <WaveformViewer
        :file="file"
        :audioPlayer="audioPlayer"
        :duration="duration"
        :currentTime="currentTime"
        :loopStart="loopStart"
        :loopEnd="loopEnd"
        @seek="seek"
        @update:loopStart="loopStart = $event"
        @update:loopEnd="loopEnd = $event"
        ref="waveformViewerRef"
      />
    </div>

    <div class="controls-row">
      <LoopControls
        :loopStart="loopStart"
        :loopEnd="loopEnd"
        :loopStartInput="loopStartInput"
        :loopEndInput="loopEndInput"
        :duration="duration"
        :isLoopValid="isLoopValid"
        @setLoopStart="setLoopStart"
        @setLoopEnd="setLoopEnd"
        @clearLoop="clearLoop"
        @loopStartInput="handleLoopStartInput"
        @loopEndInput="handleLoopEndInput"
        @applyLoopStartInput="applyLoopStartInput"
        @applyLoopEndInput="applyLoopEndInput"
        @incrementLoopStart="incrementLoopStart"
        @decrementLoopStart="decrementLoopStart"
        @incrementLoopStartMs="incrementLoopStartMs"
        @decrementLoopStartMs="decrementLoopStartMs"
        @incrementLoopEnd="incrementLoopEnd"
        @decrementLoopEnd="decrementLoopEnd"
        @incrementLoopEndMs="incrementLoopEndMs"
        @decrementLoopEndMs="decrementLoopEndMs"
      />

      <SpeedControls
        :currentSpeed="currentSpeed"
        :speedOptions="speedOptions"
        @setSpeed="setPlaybackSpeed"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useLoop } from '../composables/useLoop'
import { useNoteDetection } from '../composables/useNoteDetection'
import PlaybackControls from './PlaybackControls.vue'
import NoteDetector from './NoteDetector.vue'
import VolumeControl from './VolumeControl.vue'
import SpeedControls from './SpeedControls.vue'
import WaveformViewer from './WaveformViewer.vue'
import LoopControls from './LoopControls.vue'

const props = defineProps({
  file: {
    type: File,
    required: true
  }
})

const waveformViewerRef = ref(null)
const fileRef = computed(() => props.file)

// Use audio composable
const {
  audioPlayer,
  isPlaying,
  currentTime,
  duration,
  volume,
  currentSpeed,
  audioUrl,
  togglePlayPause: togglePlayPauseBase,
  setPlaybackSpeed,
  updateVolume,
  seek,
  handleLoadedMetadata: handleLoadedMetadataBase,
  handleTimeUpdate: handleTimeUpdateBase,
  handlePlay: handlePlayBase,
  handlePause: handlePauseBase
} = useAudio(fileRef)


// Use loop composable
const {
  loopStart,
  loopEnd,
  loopEnabled,
  loopStartInput,
  loopEndInput,
  isLoopValid,
  setLoopStart,
  setLoopEnd,
  clearLoop,
  handleLoopStartInput,
  handleLoopEndInput,
  applyLoopStartInput,
  applyLoopEndInput,
  incrementLoopStart,
  decrementLoopStart,
  incrementLoopStartMs,
  decrementLoopStartMs,
  incrementLoopEnd,
  decrementLoopEnd,
  incrementLoopEndMs,
  decrementLoopEndMs
} = useLoop(audioPlayer, computed(() => duration.value))

// Initialize audio context for note detection
const audioContext = ref(null)

// Use note detection composable
const {
  detectedNote,
  detectedFrequency,
  isNoteDetectionActive,
  setupAudioAnalysis,
  startNoteDetection,
  stopNoteDetection,
  cleanup: cleanupNoteDetection
} = useNoteDetection(audioPlayer, audioContext)

// Speed options
const speedOptions = [0.25, 0.5, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2]

// Initialize audio context for note detection
const initAudioContext = () => {
  if (!audioPlayer.value) return
  
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    audioContext.value = new AudioContextClass()
    
    // Set up analyser for real-time note detection
    setupAudioAnalysis()
    
    // Start note detection if playing
    if (!audioPlayer.value.paused) {
      if (audioContext.value.state === 'suspended') {
        audioContext.value.resume()
      }
      startNoteDetection()
    }
  } catch (error) {
    console.error('Error initializing audio context:', error)
  }
}

// Enhanced handlers
const togglePlayPause = () => {
  togglePlayPauseBase()
  
  // Manage note detection
  if (audioPlayer.value && !audioPlayer.value.paused) {
    // Resume audio context if suspended
    if (audioContext.value && audioContext.value.state === 'suspended') {
      audioContext.value.resume()
    }
    // Start note detection if analyser is set up
    if (audioContext.value) {
      startNoteDetection()
    }
  } else {
    stopNoteDetection()
  }
}

const handleLoadedMetadata = () => {
  handleLoadedMetadataBase()
  // Initialize audio context and waveform after metadata is loaded
  if (audioContext.value === null) {
    initAudioContext()
  } else {
    // Set up analysis if not already done
    setupAudioAnalysis()
  }
  
  // Initialize waveform in WaveformViewer
  if (waveformViewerRef.value) {
    waveformViewerRef.value.initAudioContext()
  }
}

const handleTimeUpdate = () => {
  handleTimeUpdateBase()
  
  // Handle loop jumping
  if (loopEnabled.value && loopStart.value !== null && loopEnd.value !== null) {
    if (audioPlayer.value && audioPlayer.value.currentTime >= loopEnd.value) {
      // Use requestAnimationFrame for smooth looping
      const now = Date.now()
      if (now - lastLoopJump.value > 100) { // Debounce
        lastLoopJump.value = now
        requestAnimationFrame(() => {
          if (audioPlayer.value && loopEnabled.value) {
            audioPlayer.value.currentTime = loopStart.value
          }
        })
      }
    }
  }
}

const handlePlay = () => {
  handlePlayBase()
}

const handlePause = () => {
  handlePauseBase()
}

const seekToStart = () => {
  // If loop is set, go to loop start, otherwise go to beginning
  if (loopStart.value !== null && loopEnd.value !== null) {
    seek(loopStart.value)
  } else {
    seek(0)
  }
}

const seekToEnd = () => {
  // If loop is set, go to loop end, otherwise go to end of track
  if (loopStart.value !== null && loopEnd.value !== null) {
    seek(loopEnd.value)
  } else if (duration.value > 0) {
    seek(duration.value)
  }
}

const handleEnded = () => {
  // If loop is enabled and valid, restart from loop start
  if (loopEnabled.value && loopStart.value !== null && loopEnd.value !== null) {
    if (audioPlayer.value) {
      requestAnimationFrame(() => {
        if (audioPlayer.value && loopEnabled.value) {
          audioPlayer.value.currentTime = loopStart.value
          audioPlayer.value.play().catch(() => {
            // Ignore play promise errors
          })
        }
      })
    }
  } else {
    // Reset to beginning
    if (audioPlayer.value) {
      audioPlayer.value.currentTime = 0
    }
  }
}

// Track last loop jump for debouncing
const lastLoopJump = ref(0)

// Automatically enable loop when both start and end are set
watch([loopStart, loopEnd], ([newStart, newEnd], [oldStart, oldEnd]) => {
  if (newStart !== null && newEnd !== null && newStart < newEnd) {
    const wasEnabled = loopEnabled.value
    loopEnabled.value = true
    // If loop range changed and audio player exists, always seek to loop start
    if (audioPlayer.value && (newStart !== oldStart || newEnd !== oldEnd)) {
      seek(newStart)
    }
  }
})


// Reset when file changes
watch(() => props.file, () => {
  // Stop note detection
  stopNoteDetection()
  
  // Clean up audio context
  if (audioContext.value) {
    audioContext.value.close().catch(() => {})
    audioContext.value = null
  }
})

// Clean up on unmount
onUnmounted(() => {
  stopNoteDetection()
  cleanupNoteDetection()
  
  // Clean up audio context
  if (audioContext.value) {
    audioContext.value.close().catch(() => {})
    audioContext.value = null
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

.controls-layout {
  display: flex;
  flex-direction: row;
  gap: 30px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.volume-play-wrapper {
  display: flex;
  gap: 15px;
  flex: 0 0 auto;
}

.note-display-column {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  align-items: flex-start;
}

.play-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
  flex-shrink: 0;
}

.play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
}

.play-btn:active {
  transform: scale(0.95);
}

.play-btn .play-icon,
.play-btn .pause-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.seek-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
  flex-shrink: 0;
}

.seek-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
}

.seek-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.seek-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.seek-btn svg {
  width: 20px;
  height: 20px;
  color: white;
}

.seek-start-btn {
  background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
  box-shadow: 0 3px 10px rgba(81, 207, 102, 0.4);
}

.seek-start-btn:hover:not(:disabled) {
  box-shadow: 0 5px 15px rgba(81, 207, 102, 0.6);
}

.seek-end-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
  box-shadow: 0 3px 10px rgba(255, 107, 107, 0.4);
}

.seek-end-btn:hover:not(:disabled) {
  box-shadow: 0 5px 15px rgba(255, 107, 107, 0.6);
}

.controls-row {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.controls-row > * {
  flex: 1;
  min-width: 300px;
}
</style>
