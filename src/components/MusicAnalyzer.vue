<template>
  <div class="analyzer-section">
    <audio
      ref="audioPlayer"
      :src="audioUrl"
      preload="metadata"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
      @play="handlePlay"
      @pause="handlePause"
    ></audio>

    <div class="analyzer-controls">
      <div class="playback-section">
        <div class="volume-play-wrapper">
          <button class="play-btn seek-btn" title="Jump to beginning" @click="seek(0)">
            <svg class="seek-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button class="play-btn" @click="togglePlayPause">
            <svg v-if="!isPlaying" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          </button>
          <button
            class="play-btn seek-btn"
            :class="{ 'seek-btn--active': isLoop }"
            title="Repeat"
            @click="toggleLoop"
          >
            <svg class="repeat-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
            </svg>
          </button>
          <VolumeControl
            :volume="volume"
            @update:volume="updateVolume"
          />
        </div>

        <PlaybackControls
          :currentTime="currentTime"
          :duration="duration"
        />
      </div>

      <ChordDetector
        :file="file"
        :current-time="currentTime"
      />

      <WaveformViewer
        :file="file"
        :audioPlayer="audioPlayer"
        :duration="duration"
        :currentTime="currentTime"
        :loopStart="null"
        :loopEnd="null"
        ref="waveformViewerRef"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAudio } from '../composables/useAudio'
import PlaybackControls from './PlaybackControls.vue'
import ChordDetector from './ChordDetector.vue'
import VolumeControl from './VolumeControl.vue'
import WaveformViewer from './WaveformViewer.vue'

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
  isLoop,
  audioUrl,
  togglePlayPause: togglePlayPauseBase,
  toggleLoop,
  updateVolume,
  seek,
  handleLoadedMetadata: handleLoadedMetadataBase,
  handleTimeUpdate: handleTimeUpdateBase,
  handlePlay: handlePlayBase,
  handlePause: handlePauseBase
} = useAudio(fileRef)

// Enhanced handlers
const togglePlayPause = () => {
  togglePlayPauseBase()
}

const handleLoadedMetadata = () => {
  handleLoadedMetadataBase()
  
  // Initialize waveform in WaveformViewer
  if (waveformViewerRef.value) {
    waveformViewerRef.value.initAudioContext()
  }
}

const handleTimeUpdate = () => {
  handleTimeUpdateBase()
}

const handlePlay = () => {
  handlePlayBase()
}

const handlePause = () => {
  handlePauseBase()
}

const seekToStart = () => {
  seek(0)
}

const seekToEnd = () => {
  if (duration.value > 0) {
    seek(duration.value)
  }
}

// Reset when file changes
watch(() => props.file, () => {
  // File changed - components will handle their own cleanup
})

onMounted(() => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = 1
  }
})
</script>

<style scoped>
.analyzer-section {
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

.analyzer-controls {
  background: #f8f9ff;
  padding: 30px;
  border-radius: 15px;
  margin-bottom: 30px;
}

.playback-section {
  margin-bottom: 20px;
}

.volume-play-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .volume-play-wrapper {
    gap: 15px;
  }
}

@media (max-width: 480px) {
  .volume-play-wrapper {
    gap: 10px;
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

.seek-btn .seek-icon,
.seek-btn .repeat-icon {
  width: 22px;
  height: 22px;
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

/* Repeat active state – must come after .seek-btn to override */
.seek-btn.seek-btn--active {
  background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
  box-shadow: 0 0 0 2px white, 0 3px 10px rgba(81, 207, 102, 0.5);
}
.seek-btn.seek-btn--active:hover {
  box-shadow: 0 0 0 2px white, 0 5px 15px rgba(81, 207, 102, 0.6);
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
</style>
