<template>
  <div class="performance-view">
    <!-- Sticky Header -->
    <header class="sticky-header">
      <div class="header-top">
        <div class="song-info">
          <h2>{{ song.title }}</h2>
          <div class="meta-info">
            <span class="bpm">
              <span class="label">BPM</span>
              <span class="value">{{ song.bpm }}</span>
            </span>
            <span class="time-sig">
              <span class="label">SIG</span>
              <span class="value">{{ song.timeSignature }}</span>
            </span>
          </div>
        </div>
        
        <div class="current-section-display" v-if="currentSection">
          <button class="btn-play" @click="togglePlay">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <div class="section-info-display">
            <span class="label">CURRENT</span>
            <span class="value">{{ currentSection.name }}</span>
            <div class="bar-progress">
              Bar {{ currentBar }} / {{ currentSection.bars }} • Beat {{ currentBeat }} / {{ beatsPerBar }}
            </div>
          </div>
        </div>
      </div>

      <!-- Instrument Filter -->
      <div class="instrument-filter">
        <button 
          class="filter-btn" 
          :class="{ active: selectedInstrument === null }"
          @click="selectedInstrument = null"
        >
          All
        </button>
        <button 
          v-for="inst in instruments" 
          :key="inst"
          class="filter-btn"
          :class="{ active: selectedInstrument === inst }"
          @click="selectedInstrument = inst"
        >
          {{ inst }}
        </button>
      </div>

      <!-- Song Strip Overview -->
      <div class="song-strip">
        <div 
          v-for="(section, index) in song.sections" 
          :key="index"
          class="strip-segment"
          :class="{ active: currentSectionIndex === index }"
          :style="{ flex: section.bars }"
        >
          <span class="strip-name">{{ section.name }}</span>
        </div>
      </div>
    </header>

    <!-- Main Scrollable Body -->
    <div class="sections-container" ref="sectionsContainer">
      <div 
        v-for="(section, index) in song.sections" 
        :key="index" 
        class="section-card"
        :id="'section-' + index"
        :class="{ active: currentSectionIndex === index }"
      >
        <div class="section-header">
          <div class="section-title">
            <input v-model="section.name" class="name-input" placeholder="Section Name" />
            <div class="bar-control">
              <button class="bar-btn" @click="decrementBars(section)" :disabled="section.bars <= 1" title="Remove Bar">−</button>
              <input v-model.number="section.bars" type="number" min="1" class="bar-input" />
              <button class="bar-btn" @click="incrementBars(section)" title="Add Bar">+</button>
              <span>Bars</span>
            </div>
          </div>
          <div class="section-actions">
            <div class="section-instructions" v-if="section.instructions">
              {{ section.instructions }}
            </div>
            <button class="btn-remove" @mousedown.stop="removeSection(index)" @touchstart.stop="removeSection(index)" title="Remove Section">
              🗑️
            </button>
          </div>
        </div>

        <div class="instruments-grid">
          <div v-for="inst in visibleInstruments" :key="inst" class="instrument-row">
            <div class="instrument-name">{{ inst }}</div>
            <div class="pattern-map">
              <div 
                v-for="bar in section.bars" 
                :key="bar" 
                class="bar-container"
              >
                <div class="bar-label">{{ bar }}</div>
                <div class="bar-beats">
                  <div 
                    v-for="beat in beatsPerBar" 
                    :key="beat" 
                    class="beat-block"
                    :class="getPatternClass(section, inst, bar, beat)"
                    @click="togglePattern(section, inst, bar, beat)"
                    :title="`Bar ${bar}, Beat ${beat}`"
                  >
                    <span class="pattern-icon">{{ getPatternIcon(section, inst, bar, beat) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Edit Controls (Simple version) -->
      <div class="edit-controls">
        <button @click="addSection" class="btn-add">
          + Add Section
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

// Mock Data
const song = ref({
  title: 'Summer Groove',
  bpm: 120,
  timeSignature: '4/4',
  sections: [
    {
      name: 'Intro',
      bars: 4,
      instructions: 'Build up slowly',
      patterns: {
        'Drums': { '1-1': 'play', '1-2': 'play', '1-3': 'play', '1-4': 'fill' },
        'Bass': { '1-1': 'rest', '1-2': 'rest', '1-3': 'play', '1-4': 'play' },
        'Guitar': { '1-1': 'play', '1-2': 'play', '1-3': 'play', '1-4': 'play' }
      }
    },
    {
      name: 'Verse 1',
      bars: 8,
      instructions: 'Tight groove',
      patterns: {
        'Drums': { '8-4': 'fill' } // Fill on beat 4 of bar 8
      }
    },
    {
      name: 'Chorus',
      bars: 8,
      instructions: 'Full volume',
      patterns: {}
    }
  ]
})

const instruments = ref(['Drums', 'Bass', 'Guitar', 'Keys'])
const selectedInstrument = ref(null)

const visibleInstruments = computed(() => {
  if (selectedInstrument.value) {
    return [selectedInstrument.value]
  }
  return instruments.value
})

const currentSectionIndex = ref(0)
const currentBar = ref(1) // 1-based index within section
const currentBeat = ref(1) // 1-based index within bar
const isPlaying = ref(false)
let playbackInterval = null

const currentSection = computed(() => {
  return song.value.sections[currentSectionIndex.value]
})

// Calculate beats per bar from time signature
const beatsPerBar = computed(() => {
  const [beats] = song.value.timeSignature.split('/').map(Number)
  return beats || 4 // Default to 4 if parsing fails
})

const togglePlay = () => {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

const play = () => {
  isPlaying.value = true
  const msPerBeat = 60000 / song.value.bpm
  
  playbackInterval = setInterval(() => {
    // Advance beat
    if (currentBeat.value < beatsPerBar.value) {
      currentBeat.value++
    } else {
      // Move to next bar
      currentBeat.value = 1
      if (currentBar.value < currentSection.value.bars) {
        currentBar.value++
      } else {
        // Next section
        if (currentSectionIndex.value < song.value.sections.length - 1) {
          currentSectionIndex.value++
          currentBar.value = 1
          currentBeat.value = 1
          scrollToSection(currentSectionIndex.value)
        } else {
          // End of song
          pause()
          resetPlayback()
          scrollToSection(0)
        }
      }
    }
  }, msPerBeat)
}

const pause = () => {
  isPlaying.value = false
  if (playbackInterval) {
    clearInterval(playbackInterval)
    playbackInterval = null
  }
}

// Reset playback position
const resetPlayback = () => {
  currentBar.value = 1
  currentBeat.value = 1
  currentSectionIndex.value = 0
}

// Helper to get pattern status for a specific beat
const getPatternClass = (section, instrument, bar, beat) => {
  const patternKey = `${bar}-${beat}`
  const pattern = section.patterns[instrument]?.[patternKey] || 'play'
  return `pattern-${pattern}`
}

const getPatternIcon = (section, instrument, bar, beat) => {
  const patternKey = `${bar}-${beat}`
  const pattern = section.patterns[instrument]?.[patternKey] || 'play'
  switch (pattern) {
    case 'rest': return '—' // Rest symbol (em dash)
    case 'fill': return '⚡'
    case 'play': return '●'
    default: return '●'
  }
}

const togglePattern = (section, instrument, bar, beat) => {
  if (!section.patterns[instrument]) {
    section.patterns[instrument] = {}
  }
  
  const patternKey = `${bar}-${beat}`
  const current = section.patterns[instrument][patternKey] || 'play'
  const next = {
    'play': 'rest',
    'rest': 'fill',
    'fill': 'play'
  }[current]
  
  section.patterns[instrument][patternKey] = next
}

const scrollToSection = (index) => {
  currentSectionIndex.value = index
  const el = document.getElementById(`section-${index}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Scroll detection for active section
let observer = null

onMounted(() => {
  const options = {
    root: document.querySelector('.sections-container'),
    threshold: 0.5 // Trigger when 50% of the section is visible
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = parseInt(entry.target.id.replace('section-', ''))
        if (!isNaN(index)) {
          currentSectionIndex.value = index
        }
      }
    })
  }, options)

  // Observe all sections
  document.querySelectorAll('.section-card').forEach((section) => {
    observer.observe(section)
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
  if (playbackInterval) {
    clearInterval(playbackInterval)
  }
})

// Watch for new sections to observe them
watch(() => song.value.sections.length, async () => {
  await nextTick()
  if (observer) {
    observer.disconnect()
    document.querySelectorAll('.section-card').forEach((section) => {
      observer.observe(section)
    })
  }
})

const addSection = () => {
  song.value.sections.push({
    name: 'New Section',
    bars: 4,
    patterns: {}
  })
}

const removeSection = (index) => {
  // Use a simple confirm for now, but ensure we're not inside a loop that might cause issues
  if (window.confirm('Are you sure you want to remove this section?')) {
    song.value.sections.splice(index, 1)
  }
}

const incrementBars = (section) => {
  section.bars = (section.bars || 1) + 1
}

const decrementBars = (section) => {
  if (section.bars > 1) {
    section.bars = section.bars - 1
  }
}
</script>

<style scoped>
.performance-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px); /* Adjust based on parent layout */
  background: #f0f2f5;
  position: relative;
  overflow: hidden;
}

/* Sticky Header */
.sticky-header {
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  padding: 0;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
}

.song-info h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: #333;
}

.meta-info {
  display: flex;
  gap: 16px;
}

.bpm, .time-sig {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f5f7fa;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

.label {
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.current-section-display {
  text-align: right;
  background: #eef2ff;
  padding: 8px 16px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.current-section-display .value {
  display: block;
  font-size: 1.2rem;
  font-weight: 700;
  color: #667eea;
}

.bar-progress {
  font-size: 0.85rem;
  color: #666;
  margin-top: 4px;
}

.instrument-filter {
  display: flex;
  gap: 8px;
  padding: 8px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
  white-space: nowrap;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: white;
  color: #666;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f0f2f5;
  color: #333;
}

.filter-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* Song Strip */
.song-strip {
  display: flex;
  height: 40px;
  width: 100%;
  background: #e0e0e0;
  overflow: hidden;
}

.strip-segment {
  border-right: 1px solid rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  background: #d1d5db;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 4px;
}

.strip-segment:hover {
  background: #9ca3af;
  color: #fff;
}

.strip-segment.active {
  background: #667eea;
  color: #fff;
}

/* Scrollable Body */
.sections-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scroll-behavior: smooth;
}

.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-left: 6px solid transparent;
  transition: all 0.3s ease;
}

.section-card.active {
  border-left-color: #667eea;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
  transform: scale(1.01);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name-input {
  font-size: 1.25rem;
  font-weight: bold;
  color: #2d3748;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px 8px;
  background: transparent;
  width: auto;
  min-width: 150px;
  font-family: inherit;
}

.name-input:hover, .name-input:focus {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.bar-control {
  display: flex;
  align-items: center;
  background: #edf2f7;
  padding: 2px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #718096;
  gap: 2px;
}

.bar-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255,255,255,0.5);
  color: #718096;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}

.bar-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.8);
  color: #4a5568;
}

.bar-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.bar-input {
  width: 40px;
  border: none;
  background: transparent;
  text-align: center;
  font-weight: 600;
  color: inherit;
  font-family: inherit;
  padding: 0 2px;
  -moz-appearance: textfield;
}

.bar-input::-webkit-outer-spin-button,
.bar-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.bar-input:focus {
  outline: none;
  background: rgba(255,255,255,0.5);
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-instructions {
  font-style: italic;
  color: #718096;
  background: #fffbeb;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #fef3c7;
  font-size: 0.9rem;
}

.btn-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.5;
  transition: all 0.2s;
}

.btn-remove:hover {
  opacity: 1;
  background: #fff5f5;
  transform: scale(1.1);
}

/* Instruments Grid */
.instruments-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instrument-row {
  display: flex;
  align-items: center;
}

.instrument-name {
  width: 80px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #4a5568;
}

.pattern-map {
  flex: 1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.bar-label {
  font-size: 0.7rem;
  color: #a0aec0;
  font-weight: 600;
  text-align: center;
  min-width: 20px;
}

.bar-beats {
  display: flex;
  gap: 2px;
  background: #f7fafc;
  padding: 2px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.beat-block {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  background: #edf2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.7rem;
  color: #a0aec0;
}

.beat-block:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.pattern-play {
  background: #c3dafe;
  color: #4c51bf;
}

.pattern-rest {
  background: #f7fafc;
  color: #cbd5e0;
  border: 1px dashed #cbd5e0;
}

.pattern-fill {
  background: #fed7e2;
  color: #b83280;
}

.btn-add {
  width: 100%;
  padding: 16px;
  background: white;
  border: 2px dashed #cbd5e0;
  border-radius: 12px;
  color: #718096;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  border-color: #667eea;
  color: #667eea;
  background: #f8f9ff;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .current-section-display {
    width: 100%;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
