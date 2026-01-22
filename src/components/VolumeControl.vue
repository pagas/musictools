<template>
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
      @input="$emit('update:volume', parseInt($event.target.value))"
    />
    <span>{{ volume }}%</span>
  </div>
</template>

<script setup>
defineProps({
  volume: {
    type: Number,
    required: true
  }
})

defineEmits(['update:volume'])
</script>

<style scoped>
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
  appearance: none;
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
  transition: all 0.2s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  background: #5568d3;
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.volume-slider::-moz-range-thumb:hover {
  background: #5568d3;
  transform: scale(1.2);
}

.volume-control span {
  min-width: 45px;
  font-weight: 600;
  color: #667eea;
  font-size: 0.9em;
}

/* Mobile responsive styles */
@media (max-width: 480px) {
  .volume-control {
    gap: 10px;
  }

  .volume-icon {
    width: 20px;
    height: 20px;
  }

  .volume-slider {
    width: 100px;
  }

  .volume-control span {
    min-width: 40px;
    font-size: 0.85em;
  }
}
</style>
