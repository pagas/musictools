<template>
  <div class="note-display">
    <span class="note-label">Note:</span>
    <span class="previous-note">
      <span class="previous-label">Previous:</span>
      <span class="previous-value" v-if="previousNote">{{ previousNote }}</span>
      <span class="previous-placeholder" v-else>—</span>
    </span>
    <span class="note-value" v-if="detectedNote">{{ detectedNote }}</span>
    <span class="note-placeholder" v-if="isNoteDetectionActive && !detectedNote">—</span>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
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

const previousNote = ref('')

// Watch for note changes and store previous note
watch(() => props.detectedNote, (newNote, oldNote) => {
  if (oldNote && oldNote !== newNote && newNote) {
    // Only store previous note if there's a new note detected
    previousNote.value = oldNote
  } else if (!newNote) {
    // Clear previous note when current note becomes empty
    previousNote.value = ''
  }
})

// Clear previous note when music stops
watch(() => props.isNoteDetectionActive, (isActive) => {
  if (!isActive) {
    previousNote.value = ''
  }
})
</script>

<style scoped>
.note-display {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: flex-start;
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

.note-value {
  color: #333;
  font-weight: 700;
  font-size: 1.1em;
  letter-spacing: 0.5px;
}

.note-placeholder {
  color: #999;
  font-size: 1.1em;
  font-weight: 500;
  min-width: 20px;
}

.previous-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 12px;
  border-right: 1px solid rgba(102, 126, 234, 0.2);
  min-width: 120px;
  flex-shrink: 0;
}

.previous-label {
  color: #999;
  font-size: 0.85em;
  font-weight: 500;
}

.previous-value {
  color: #666;
  font-weight: 600;
  font-size: 0.95em;
}

.previous-placeholder {
  color: #999;
  font-size: 0.95em;
  font-weight: 500;
}
</style>
