<template>
  <div class="note-display">
    <span class="note-label">Note:</span>
    <span class="note-status" :class="{ active: isNoteDetectionActive, inactive: !isNoteDetectionActive }">
      <span class="status-dot"></span>
      {{ isNoteDetectionActive ? 'Active' : 'Inactive' }}
    </span>
    <span class="note-value" v-if="detectedNote">{{ detectedNote }}</span>
    <span class="note-frequency" v-if="detectedFrequency">({{ detectedFrequency.toFixed(1) }} Hz)</span>
    <span class="note-placeholder" v-if="isNoteDetectionActive && !detectedNote">No note detected</span>
  </div>
</template>

<script setup>
defineProps({
  isNoteDetectionActive: {
    type: Boolean,
    required: true
  },
  detectedNote: {
    type: String,
    default: ''
  },
  detectedFrequency: {
    type: Number,
    default: 0
  }
})
</script>

<style scoped>
.note-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  font-size: 0.95em;
  min-height: 32px;
  flex-wrap: wrap;
}

.note-label {
  color: #667eea;
  font-weight: 600;
}

.note-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.note-status.active {
  color: #51cf66;
  background: rgba(81, 207, 102, 0.15);
}

.note-status.inactive {
  color: #999;
  background: rgba(153, 153, 153, 0.1);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  transition: all 0.3s ease;
}

.note-status.active .status-dot {
  background: #51cf66;
  box-shadow: 0 0 6px rgba(81, 207, 102, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

.note-status.inactive .status-dot {
  background: #999;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.note-value {
  color: #333;
  font-weight: 700;
  font-size: 1.1em;
  letter-spacing: 0.5px;
}

.note-frequency {
  color: #666;
  font-size: 0.85em;
  font-weight: 500;
}

.note-placeholder {
  color: #999;
  font-size: 0.9em;
  font-style: italic;
}
</style>
