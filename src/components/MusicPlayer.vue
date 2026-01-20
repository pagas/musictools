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
      <PlaybackControls
        :isPlaying="isPlaying"
        :currentTime="currentTime"
        :duration="duration"
        @togglePlayPause="togglePlayPause"
      />
      
      <NoteDetector
        :isNoteDetectionActive="isNoteDetectionActive"
        :detectedNote="detectedNote"
        :detectedFrequency="detectedFrequency"
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

      <VolumeControl
        :volume="volume"
        @update:volume="updateVolume"
      />
    </div>

    <LoopControls
      :loopStart="loopStart"
      :loopEnd="loopEnd"
      :loopEnabled="loopEnabled"
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
      @update:loopEnabled="loopEnabled = $event"
    />

    <SpeedControls
      :currentSpeed="currentSpeed"
      :speedOptions="speedOptions"
      @setSpeed="setPlaybackSpeed"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useNoteDetection } from '../composables/useNoteDetection'
import { useLoop } from '../composables/useLoop'
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

// Speed options
const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

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

// Enhanced handlers that integrate note detection
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
  // Resume audio context if suspended
  if (audioContext.value && audioContext.value.state === 'suspended') {
    audioContext.value.resume()
  }
  // Start note detection if analyser is set up
  if (audioContext.value) {
    startNoteDetection()
  }
}

const handlePause = () => {
  handlePauseBase()
  stopNoteDetection()
}

const handleEnded = () => {
  stopNoteDetection()
  
  // If loop is enabled and valid, restart from loop start
  if (loopEnabled.value && loopStart.value !== null && loopEnd.value !== null) {
    if (audioPlayer.value) {
      requestAnimationFrame(() => {
        if (audioPlayer.value && loopEnabled.value) {
          audioPlayer.value.currentTime = loopStart.value
          audioPlayer.value.play().catch(() => {
            // Ignore play promise errors
          })
          // Restart note detection after looping
          if (audioContext.value) {
            startNoteDetection()
          }
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
</style>
