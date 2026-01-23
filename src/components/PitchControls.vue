<template>
  <div class="pitch-controls">
    <h3>Pitch</h3>
    <div class="pitch-control-wrapper">
      <button
        class="pitch-btn pitch-btn-decrease"
        @click="decreasePitch"
        :disabled="currentPitch <= minPitch"
        title="Decrease pitch by 1 semitone"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <div class="pitch-display">
        <span class="pitch-value">{{ formatPitch(currentPitch) }}</span>
        <span class="pitch-label">semitones</span>
      </div>
      <button
        class="pitch-btn pitch-btn-increase"
        @click="increasePitch"
        :disabled="currentPitch >= maxPitch"
        title="Increase pitch by 1 semitone"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
      <button
        class="pitch-btn pitch-btn-reset"
        @click="resetPitch"
        :disabled="currentPitch === 0"
        title="Reset pitch to 0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
          <path d="M3 21v-5h5"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPitch: {
    type: Number,
    required: true
  },
  pitchOptions: {
    type: Array,
    default: () => [-12, -6, -3, -2, -1, 0, 1, 2, 3, 6, 12]
  }
})

const emit = defineEmits(['setPitch'])

const minPitch = computed(() => Math.min(...props.pitchOptions))
const maxPitch = computed(() => Math.max(...props.pitchOptions))

const formatPitch = (semitones) => {
  if (semitones === 0) return '0'
  if (semitones > 0) return `+${semitones}`
  return `${semitones}`
}

const decreasePitch = () => {
  const newPitch = props.currentPitch - 1
  if (newPitch >= minPitch.value) {
    emit('setPitch', newPitch)
  }
}

const increasePitch = () => {
  const newPitch = props.currentPitch + 1
  if (newPitch <= maxPitch.value) {
    emit('setPitch', newPitch)
  }
}

const resetPitch = () => {
  emit('setPitch', 0)
}
</script>

<style scoped>
.pitch-controls {
  display: flex;
  flex-direction: column;
  background: #f8f9ff;
  border-radius: 15px;
}

.pitch-controls h3 {
  margin-bottom: 12px;
  color: #333;
  font-size: 1.1em;
}

.pitch-control-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.pitch-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: #667eea;
  flex-shrink: 0;
}

.pitch-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: #f0f0ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
}

.pitch-btn:active:not(:disabled) {
  transform: translateY(0);
}

.pitch-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pitch-btn-reset {
  background: #f0f0f0;
  border-color: #ccc;
}

.pitch-btn-reset:hover:not(:disabled) {
  background: #e0e0e0;
  border-color: #999;
}

.pitch-btn-reset:disabled {
  opacity: 0.3;
}

.pitch-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2.5;
}

.pitch-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.pitch-value {
  font-size: 1.5em;
  font-weight: 700;
  color: #667eea;
  line-height: 1.2;
}

.pitch-label {
  font-size: 0.75em;
  color: #666;
  margin-top: 2px;
}

/* Mobile responsive styles */
@media (max-width: 480px) {
  .pitch-controls h3 {
    font-size: 1em;
    margin-bottom: 10px;
  }

  .pitch-control-wrapper {
    gap: 12px;
  }

  .pitch-btn {
    width: 44px;
    height: 44px;
  }

  .pitch-btn svg {
    width: 22px;
    height: 22px;
  }

  .pitch-value {
    font-size: 1.3em;
  }

  .pitch-label {
    font-size: 0.7em;
  }
}
</style>
