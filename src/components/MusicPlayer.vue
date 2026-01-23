<template>
  <div class="player-section">
    <audio ref="audioPlayer" :src="audioUrl" :loop="repeatTrack" preload="metadata"
      @loadedmetadata="handleLoadedMetadata" @timeupdate="handleTimeUpdate" @play="handlePlay" @pause="handlePause"
      @ended="handleEnded"></audio>

    <div class="player-controls">
      <div class="controls-layout">
        <div class="volume-play-wrapper">
          <button class="play-btn" @click="togglePlayPause">
            <svg v-if="!isPlaying" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>
          <button class="seek-btn seek-start-btn" @click="seekToStart" :disabled="!duration || duration === 0"
            title="Go to Start">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>
          <button class="seek-btn repeat-btn" :class="{ active: repeatTrack }" @click="toggleRepeat"
            :disabled="!duration || duration === 0" title="Repeat Track">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </button>
          <VolumeControl :volume="volume" @update:volume="updateVolume" />
        </div>

        <div class="note-display-column">
          <NoteDetector :isNoteDetectionActive="isNoteDetectionActive" :detectedNote="detectedNote"
            :detectedFrequency="detectedFrequency" :currentTime="currentTime" />
        </div>
      </div>

      <PlaybackControls :currentTime="currentTime" :duration="duration" />

      <WaveformViewer :file="file" :audioPlayer="audioPlayer" :duration="duration" :currentTime="currentTime"
        :loopStart="loopStart" :loopEnd="loopEnd" @update:loopStart="loopStart = $event"
        @update:loopEnd="loopEnd = $event" ref="waveformViewerRef" />

      <div class="controls-section">


        <div class="loop-controls-row">
          <LoopControls :loopStart="loopStart" :loopEnd="loopEnd" :loopStartInput="loopStartInput"
            :loopEndInput="loopEndInput" :duration="duration" :isLoopValid="isLoopValid" @setLoopStart="setLoopStart"
            @setLoopEnd="setLoopEnd" @clearLoop="clearLoop" @loopStartInput="handleLoopStartInput"
            @loopEndInput="handleLoopEndInput" @applyLoopStartInput="applyLoopStartInput"
            @applyLoopEndInput="applyLoopEndInput" @incrementLoopStart="incrementLoopStart"
            @decrementLoopStart="decrementLoopStart" @incrementLoopStartMs="incrementLoopStartMs"
            @decrementLoopStartMs="decrementLoopStartMs" @incrementLoopEnd="incrementLoopEnd"
            @decrementLoopEnd="decrementLoopEnd" @incrementLoopEndMs="incrementLoopEndMs"
            @decrementLoopEndMs="decrementLoopEndMs" />
        </div>

        <div class="speed-controls-row">
          <SpeedControls :currentSpeed="currentSpeed" :speedOptions="speedOptions" @setSpeed="setPlaybackSpeed" />
        </div>

        <div class="pitch-controls-row">
          <PitchControls :currentPitch="currentPitch" :pitchOptions="pitchOptions" @setPitch="setPitch" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import { useLoop } from '../composables/useLoop'
import { useNoteDetection } from '../composables/useNoteDetection'
import createPitchShifter from 'soundbank-pitch-shift'
import PlaybackControls from './PlaybackControls.vue'
import NoteDetector from './NoteDetector.vue'
import VolumeControl from './VolumeControl.vue'
import SpeedControls from './SpeedControls.vue'
import PitchControls from './PitchControls.vue'
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
  currentPitch,
  audioUrl,
  togglePlayPause: togglePlayPauseBase,
  setPlaybackSpeed,
  setPitch,
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

// Initialize audio context for note detection and pitch shifting
const audioContext = ref(null)

// Use note detection composable
const {
  detectedNote,
  detectedFrequency,
  isNoteDetectionActive,
  setupAudioAnalysis,
  startNoteDetection,
  stopNoteDetection,
  cleanup: cleanupNoteDetection,
  getSourceNode,
  setPitchShifterNode
} = useNoteDetection(audioPlayer, audioContext)

// Pitch shifter using soundbank-pitch-shift
const pitchShifterNode = ref(null)

// Speed options
const speedOptions = [0.25, 0.5, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2]

// Pitch options (in semitones)
const pitchOptions = [-12, -6, -3, -2, -1, 0, 1, 2, 3, 6, 12]

// Repeat track state (for whole track, not loop)
const repeatTrack = ref(false)

// Initialize audio context for note detection
const initAudioContext = () => {
  if (!audioPlayer.value) return

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    audioContext.value = new AudioContextClass()

    // Set up analyser for real-time note detection
    setupAudioAnalysis()

    // Initialize pitch shifter after source node is created
    // Wait a bit for setupAudioAnalysis to complete
    setTimeout(() => {
      initPitchShifter()
    }, 200)

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

// Initialize pitch shifter using soundbank-pitch-shift
const initPitchShifter = () => {
  if (!audioContext.value) return

  try {
    // Get source node - it should already be created by note detection
    const sourceNode = getSourceNode()
    if (!sourceNode) {
      // Retry after a short delay
      setTimeout(initPitchShifter, 100)
      return
    }

    // Clean up existing pitch shifter
    cleanupPitchShifter()

    // Create pitch shifter node using soundbank-pitch-shift
    // This creates an AudioNode that can be inserted into the audio chain
    pitchShifterNode.value = createPitchShifter(audioContext.value)

    // Disconnect source from analyser
    sourceNode.disconnect()
    
    // Connect: source -> pitch shifter -> analyser -> destination
    sourceNode.connect(pitchShifterNode.value)
    
    // Set the pitch shifter output as the node to insert in the audio chain
    // This will reconnect the analyser to use pitch shifter output
    setPitchShifterNode(pitchShifterNode.value)

    // Apply current pitch
    applyPitchShift()
  } catch (error) {
    console.error('Error initializing pitch shifter:', error)
    // If pitch shifter fails, just apply speed normally (pitch changes won't work)
    if (audioPlayer.value) {
      audioPlayer.value.playbackRate = currentSpeed.value
    }
  }
}

// Apply pitch shift using soundbank-pitch-shift
const applyPitchShift = () => {
  if (!audioPlayer.value) return

  // Always apply speed to audio element (speed is independent)
  audioPlayer.value.playbackRate = currentSpeed.value

  // If pitch shifter is available, use it
  if (pitchShifterNode.value) {
    // soundbank-pitch-shift uses semitones directly via transpose property
    pitchShifterNode.value.transpose = currentPitch.value
    
    // Set wet/dry mix (1 = fully processed, 0 = original)
    if (pitchShifterNode.value.wet) {
      pitchShifterNode.value.wet.value = currentPitch.value === 0 ? 0 : 1
    }
    if (pitchShifterNode.value.dry) {
      pitchShifterNode.value.dry.value = currentPitch.value === 0 ? 1 : 0
    }
  }
  // If pitch shifter is not available, only speed is applied (pitch changes won't work)
}

// Watch for pitch and speed changes and apply them
watch([() => currentPitch.value, () => currentSpeed.value], () => {
  applyPitchShift()
}, { immediate: true })

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
    // Reinitialize pitch shifter if needed
    setTimeout(() => {
      if (!pitchShifterNode.value) {
        initPitchShifter()
      }
    }, 200)
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

const toggleRepeat = () => {
  // Toggle repeat for whole track
  repeatTrack.value = !repeatTrack.value
}

const handleEnded = () => {
  // If loop is enabled and valid, restart from loop start
  // (Note: repeatTrack is handled by audio element's loop property)
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
  } else if (!repeatTrack.value) {
    // Only reset to beginning if repeat is not enabled
    // (If repeatTrack is true, the audio element will loop automatically)
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


// Clean up pitch shifter
const cleanupPitchShifter = () => {
  if (pitchShifterNode.value) {
    try {
      pitchShifterNode.value.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }
    pitchShifterNode.value = null
  }
  
  setPitchShifterNode(null)
}

// Reset when file changes
watch(() => props.file, () => {
  // Stop note detection
  stopNoteDetection()

  // Clean up pitch shifter
  cleanupPitchShifter()

  // Clean up audio context
  if (audioContext.value) {
    audioContext.value.close().catch(() => { })
    audioContext.value = null
  }
})

// Clean up on unmount
onUnmounted(() => {
  stopNoteDetection()
  cleanupNoteDetection()

  // Clean up pitch shifter
  cleanupPitchShifter()

  // Clean up audio context
  if (audioContext.value) {
    audioContext.value.close().catch(() => { })
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
  flex-wrap: wrap;
}

.note-display-column {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  align-items: flex-start;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .player-controls {
    padding: 20px 15px;
  }

  .controls-layout {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }

  .volume-play-wrapper {
    justify-content: center;
    gap: 10px;
    width: 100%;
  }

  .note-display-column {
    justify-content: center;
    width: 100%;
  }

  .controls-section {
    margin-top: 20px;
    gap: 15px;
  }
}

@media (max-width: 480px) {
  .player-controls {
    padding: 15px 10px;
  }

  .controls-layout {
    gap: 15px;
  }

  .volume-play-wrapper {
    gap: 8px;
  }

  .play-btn,
  .seek-btn {
    width: 36px;
    height: 36px;
  }

  .play-btn .play-icon,
  .play-btn .pause-icon {
    width: 20px;
    height: 20px;
  }

  .seek-btn svg {
    width: 18px;
    height: 18px;
  }
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

.repeat-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
}

.repeat-btn:hover:not(:disabled) {
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
}

.repeat-btn.active {
  background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
  box-shadow: 0 3px 10px rgba(81, 207, 102, 0.4);
}

.repeat-btn.active:hover:not(:disabled) {
  box-shadow: 0 5px 15px rgba(81, 207, 102, 0.6);
}

.controls-section {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.speed-controls-row {
  width: 100%;
}

.pitch-controls-row {
  width: 100%;
}

.loop-controls-row {
  width: 100%;
}
</style>
