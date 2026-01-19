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
        <input
          type="range"
          class="progress-bar"
          :min="0"
          :max="duration || 100"
          :value="currentTime"
          @input="seek"
        />
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
import { ref, computed, watch, onMounted } from 'vue'

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
  isPlaying.value = false
  currentTime.value = 0
  if (audioPlayer.value) {
    audioPlayer.value.currentTime = 0
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

// Reset player when file changes
watch(() => props.file, () => {
  isPlaying.value = false
  currentSpeed.value = 1
  customSpeed.value = 1
  currentTime.value = 0
  volume.value = 100
  
  if (audioPlayer.value) {
    audioPlayer.value.playbackRate = 1
    audioPlayer.value.volume = 1
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
}
</style>
