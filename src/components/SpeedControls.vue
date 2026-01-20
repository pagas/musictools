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
    <div class="custom-speed">
      <label for="customSpeed">Custom Speed:</label>
      <input
        id="customSpeed"
        type="number"
        v-model.number="customSpeedLocal"
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
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  currentSpeed: {
    type: Number,
    required: true
  },
  speedOptions: {
    type: Array,
    default: () => [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  }
})

const emit = defineEmits(['setSpeed'])

const customSpeedLocal = ref(props.currentSpeed)

watch(() => props.currentSpeed, (newSpeed) => {
  customSpeedLocal.value = newSpeed
})

const applyCustomSpeed = () => {
  const speed = parseFloat(customSpeedLocal.value)
  if (speed >= 0.1 && speed <= 4) {
    emit('setSpeed', speed)
  }
}
</script>

<style scoped>
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
  margin-bottom: 20px;
}

.speed-btn {
  padding: 12px 24px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
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

.custom-speed {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 15px;
}

.custom-speed label {
  font-weight: 600;
  color: #333;
}

.custom-speed input {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1em;
  width: 80px;
  text-align: center;
}

.custom-speed input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-apply {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-apply:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.current-speed-display {
  text-align: center;
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
}

.current-speed-display span {
  color: #667eea;
}
</style>
