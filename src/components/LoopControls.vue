<template>
  <div class="loop-controls">
    <h3>Loop Controls</h3>
    <div class="loop-buttons">
      <button 
        class="loop-btn loop-clear" 
        @click="$emit('clearLoop')"
        v-if="loopStart !== null || loopEnd !== null"
      >
        Clear Loop
      </button>
    </div>
    <div class="loop-time-inputs">
      <div class="time-input-group">
        <label for="loopStartInput">Loop Start (MM:SS or MM:SS.ms):</label>
        <div class="time-input-wrapper">
          <input
            id="loopStartInput"
            type="text"
            class="time-input"
            :value="loopStartInput"
            @input="$emit('loopStartInput', $event)"
            @blur="$emit('applyLoopStartInput')"
            @keypress.enter="$emit('applyLoopStartInput')"
            placeholder="0:00.0"
          />
          <div class="time-input-buttons">
            <div class="time-btn-group">
              <button 
                type="button" 
                class="time-btn time-btn-up" 
                @click="$emit('incrementLoopStart')"
                :disabled="loopStart === null || duration === 0"
                title="Increase by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                class="time-btn time-btn-down" 
                @click="$emit('decrementLoopStart')"
                :disabled="loopStart === null || loopStart <= 0"
                title="Decrease by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div class="time-btn-group time-btn-group-ms">
              <button 
                type="button" 
                class="time-btn time-btn-up time-btn-ms" 
                @click="$emit('incrementLoopStartMs')"
                :disabled="loopStart === null || duration === 0"
                title="Increase by 100 milliseconds"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                class="time-btn time-btn-down time-btn-ms" 
                @click="$emit('decrementLoopStartMs')"
                :disabled="loopStart === null || loopStart <= 0"
                title="Decrease by 100 milliseconds"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="time-input-group">
        <label for="loopEndInput">Loop End (MM:SS or MM:SS.ms):</label>
        <div class="time-input-wrapper">
          <input
            id="loopEndInput"
            type="text"
            class="time-input"
            :value="loopEndInput"
            @input="$emit('loopEndInput', $event)"
            @blur="$emit('applyLoopEndInput')"
            @keypress.enter="$emit('applyLoopEndInput')"
            placeholder="0:00.0"
          />
          <div class="time-input-buttons">
            <div class="time-btn-group">
              <button 
                type="button" 
                class="time-btn time-btn-up" 
                @click="$emit('incrementLoopEnd')"
                :disabled="loopEnd === null || loopEnd >= duration || (loopStart !== null && loopEnd >= duration - 0.1)"
                title="Increase by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                class="time-btn time-btn-down" 
                @click="$emit('decrementLoopEnd')"
                :disabled="loopEnd === null || (loopStart !== null && loopEnd <= loopStart + 0.1)"
                title="Decrease by 1 second"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <div class="time-btn-group time-btn-group-ms">
              <button 
                type="button" 
                class="time-btn time-btn-up time-btn-ms" 
                @click="$emit('incrementLoopEndMs')"
                :disabled="loopEnd === null || loopEnd >= duration || (loopStart !== null && loopEnd >= duration - 0.001)"
                title="Increase by 100 milliseconds"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                class="time-btn time-btn-down time-btn-ms" 
                @click="$emit('decrementLoopEndMs')"
                :disabled="loopEnd === null || (loopStart !== null && loopEnd <= loopStart + 0.001)"
                title="Decrease by 100 milliseconds"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="loop-toggle">
      <label class="loop-switch">
        <input 
          type="checkbox" 
          :checked="loopEnabled" 
          :disabled="!isLoopValid"
          @change="$emit('update:loopEnabled', $event.target.checked)"
        >
        <span class="slider"></span>
        <span class="label-text">Enable Loop</span>
      </label>
      <span v-if="!isLoopValid && (loopStart !== null || loopEnd !== null)" class="loop-warning">
        Both start and end must be set to enable loop
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loopStart: {
    type: Number,
    default: null
  },
  loopEnd: {
    type: Number,
    default: null
  },
  loopEnabled: {
    type: Boolean,
    default: false
  },
  loopStartInput: {
    type: String,
    default: ''
  },
  loopEndInput: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    required: true
  },
  isLoopValid: {
    type: Boolean,
    required: true
  }
})

defineEmits([
  'clearLoop',
  'loopStartInput',
  'loopEndInput',
  'applyLoopStartInput',
  'applyLoopEndInput',
  'incrementLoopStart',
  'decrementLoopStart',
  'incrementLoopStartMs',
  'decrementLoopStartMs',
  'incrementLoopEnd',
  'decrementLoopEnd',
  'incrementLoopEndMs',
  'decrementLoopEndMs'
])
</script>

<style scoped>
.loop-controls {
  background: #f8f9ff;
  padding: 30px;
  border-radius: 15px;
  margin-bottom: 30px;
}

.loop-controls h3 {
  margin-bottom: 20px;
  color: #333;
  text-align: center;
  font-size: 1.5em;
}

.loop-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 25px;
}

.loop-btn {
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

.loop-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
}

.loop-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.loop-btn.loop-clear {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.loop-btn.loop-clear:hover {
  background: #ff5252;
  border-color: #ff5252;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(255, 107, 107, 0.3);
}

.loop-time-inputs {
  display: flex;
  gap: 30px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 25px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.time-input-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.95em;
}

.time-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 195px;
  width: 100%;
}

.time-input {
  min-width: 175px;
  padding: 10px 115px 10px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1.1em;
  font-weight: 600;
  color: white;
  background: #667eea;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  overflow: visible;
  text-overflow: visible;
}

.time-input:focus {
  outline: none;
  border-color: #764ba2;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.time-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.time-input-buttons {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.time-btn-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.time-btn-group-ms {
  border-left: 1px solid rgba(255, 255, 255, 0.3);
  padding-left: 4px;
}

.time-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 24px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s ease;
  padding: 0;
}

.time-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.time-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.time-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.time-btn svg {
  width: 14px;
  height: 14px;
}

.time-btn-ms {
  width: 24px;
  height: 20px;
  opacity: 0.8;
}

.time-btn-ms svg {
  width: 14px;
  height: 14px;
}

.loop-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  flex-direction: column;
}

.loop-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.loop-switch input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.slider {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  background-color: #ccc;
  border-radius: 24px;
  transition: 0.4s;
  margin-right: 10px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.loop-switch input:checked + .slider {
  background-color: #667eea;
}

.loop-switch input:checked + .slider:before {
  transform: translateX(26px);
}

.loop-switch input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.label-text {
  font-weight: 600;
  color: #333;
}

.loop-warning {
  color: #ff6b6b;
  font-size: 0.85em;
  font-weight: 600;
  text-align: center;
}
</style>
