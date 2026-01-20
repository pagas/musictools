<template>
  <div class="playback-controls">
    <button class="btn-control" @click="$emit('togglePlayPause')">
      <svg v-if="!isPlaying" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
      </svg>
    </button>
    
    <div class="time-display">
      <span>{{ formatTime(currentTime) }}</span>
      <span>{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script setup>
import { formatTime } from '../utils/timeFormat'

defineProps({
  isPlaying: {
    type: Boolean,
    required: true
  },
  currentTime: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
})

defineEmits(['togglePlayPause'])
</script>

<style scoped>
.playback-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  margin-bottom: 30px;
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

.time-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.9em;
  color: #666;
  font-weight: 600;
  width: 100%;
}
</style>
