<template>
  <div class="chord-detector">
    <div class="detector-header">
      <h4 class="detector-title">Music Analysis</h4>
      <button 
        v-if="!isAnalyzing && file" 
        class="analyze-btn" 
        @click="startAnalysis"
        :disabled="!file"
      >
        🔍 Analyze Music
      </button>
    </div>
    <div v-if="isAnalyzing" class="analyzing-indicator">
      <span class="analyzing-dot"></span>
      <span>Analyzing recording...</span>
    </div>
    <div v-else-if="detectedChords.length > 0 || detectedTempo || detectedKey" class="analysis-results">
      <div v-if="detectedTempo || detectedKey" class="music-info">
        <div v-if="detectedTempo" class="info-item">
          <span class="info-label">Tempo:</span>
          <span class="info-value">{{ detectedTempo }} BPM</span>
        </div>
        <div v-if="detectedKey" class="info-item">
          <span class="info-label">Key:</span>
          <span class="info-value">{{ detectedKey }}</span>
        </div>
      </div>
      <div v-if="detectedChords.length > 0" class="chords-section">
        <h5 class="chords-title">Detected Chords</h5>
        <div class="chords-list">
      <div
        v-for="(chordGroup, index) in detectedChords"
        :key="index"
        class="chord-item"
      >
        <span class="chord-name">{{ chordGroup.chord.fullName }}</span>
        <span class="chord-time">{{ formatTime(chordGroup.startTime) }} - {{ formatTime(chordGroup.endTime) }}</span>
        <span class="chord-duration">({{ formatDuration(chordGroup.duration) }})</span>
          <span class="chord-confidence">{{ chordGroup.chord.confidence }}%</span>
        </div>
      </div>
      </div>
    </div>
    <div v-else class="no-chords">
      <span class="no-chords-text">Click "Analyze Music" to analyze the recording</span>
    </div>
  </div>
</template>

<script setup>
import { useChordDetection } from '../composables/useChordDetection'

const props = defineProps({
  file: {
    type: File,
    required: false,
    default: null
  }
})

const {
  detectedChords,
  detectedTempo,
  detectedKey,
  isAnalyzing,
  analyzeChords
} = useChordDetection(() => props.file)

const startAnalysis = () => {
  if (props.file && !isAnalyzing.value) {
    analyzeChords()
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDuration = (seconds) => {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`
  }
  return `${seconds.toFixed(1)}s`
}
</script>

<style scoped>
.chord-detector {
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  min-height: 60px;
}

.analysis-results {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.music-info {
  display: flex;
  gap: 20px;
  padding: 12px;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 8px;
  justify-content: center;
  align-items: center;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-weight: 600;
  color: #667eea;
  font-size: 0.9em;
}

.info-value {
  font-weight: 700;
  color: #333;
  font-size: 1.1em;
  background: white;
  padding: 4px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chords-section {
  margin-top: 10px;
}

.chords-title {
  margin: 0 0 10px 0;
  color: #667eea;
  font-size: 0.95em;
  font-weight: 600;
  text-align: center;
}

.detector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.detector-title {
  margin: 0;
  color: #667eea;
  font-size: 1em;
  font-weight: 600;
}

.analyze-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.analyze-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.analyze-btn:active:not(:disabled) {
  transform: translateY(0);
}

.analyze-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chords-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.chord-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
  font-size: 0.9em;
  transition: all 0.3s ease;
}

.chord-item:hover {
  transform: translateX(5px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.chord-name {
  font-weight: 700;
  font-size: 1.1em;
  min-width: 80px;
}

.chord-time {
  font-size: 0.85em;
  opacity: 0.9;
  min-width: 120px;
}

.chord-duration {
  font-size: 0.8em;
  opacity: 0.8;
  font-style: italic;
}

.chord-confidence {
  font-size: 0.8em;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.no-chords {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 0.9em;
  font-style: italic;
}

.analyzing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
  color: #667eea;
  font-size: 0.85em;
  font-weight: 600;
}

.analyzing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}
</style>
