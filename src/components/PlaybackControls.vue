<template>
  <div class="playback-controls">
    <div class="time-display">
      <span>{{ formatTime(currentTime) }}</span>
      <span>{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script setup>
import { formatTime } from '../utils/timeFormat'

defineProps({
  currentTime: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
})
</script>

<style scoped>
.playback-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
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
