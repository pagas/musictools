<template>
  <div class="speed-controls">
    <h3>Playback Speed</h3>
    <div class="speed-buttons">
      <button
        v-for="speed in speedOptions"
        :key="speed"
        class="speed-btn"
        :class="{ active: currentSpeed === speed }"
        @click="$emit('setSpeed', speed)"
      >
        {{ speed }}x
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentSpeed: {
    type: Number,
    required: true
  },
  speedOptions: {
    type: Array,
    default: () => [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  }
})

defineEmits(['setSpeed'])
</script>

<style scoped>
.speed-controls {
  display: flex;
  flex-direction: column;
  background: #f8f9ff;
  padding: 15px;
  border-radius: 15px;
}

.speed-controls h3 {
  margin-bottom: 12px;
  color: #333;
  text-align: center;
  font-size: 1.1em;
}

.speed-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.speed-btn {
  padding: 8px 16px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  color: #667eea;
  transition: all 0.3s ease;
}

.speed-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
}

.speed-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
