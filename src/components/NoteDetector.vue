<template>
  <div class="note-display">
    <span class="note-label">Note:</span>
    <span class="previous-note">
      <span class="previous-label">Previous:</span>
      <span class="previous-value" v-if="previousNote">{{ previousNote }}</span>
      <span class="previous-placeholder" v-else>—</span>
    </span>
    <span class="note-value" v-if="currentNote">{{ currentNote }}</span>
    <span class="note-placeholder" v-else>—</span>
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
  },
  currentTime: {
    type: Number,
    default: 0
  }
})

const previousNote = ref('')
const currentNote = ref('')
const lastCurrentTime = ref(0)

// Watch for note changes and store previous/current notes
watch(() => props.detectedNote, (newNote, oldNote) => {
  if (newNote) {
    // Store the new note as current
    if (oldNote && oldNote !== newNote) {
      // Store old note as previous when a new note is detected
      previousNote.value = oldNote
    }
    currentNote.value = newNote
  }
  // Don't clear currentNote when newNote becomes empty - keep it displayed
})

// Clear notes when music restarts from beginning or when seeking while stopped
watch(() => props.currentTime, (newTime, oldTime) => {
  // Detect restart: time goes from non-zero to near-zero (within 0.1s)
  if (oldTime > 0.1 && newTime < 0.1) {
    previousNote.value = ''
    currentNote.value = ''
  } else if (!props.isNoteDetectionActive && lastCurrentTime.value !== undefined) {
    // Detect seek/jump: large change in time (> 0.5s) while music is stopped
    const timeDiff = Math.abs(newTime - lastCurrentTime.value)
    if (timeDiff > 0.5) {
      previousNote.value = ''
      currentNote.value = ''
    }
  }
  lastCurrentTime.value = newTime
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
