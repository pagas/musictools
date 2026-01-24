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
              Bar {{ currentBar }} / {{ currentSection.bars }}
            </div>
          </div>
        </div>
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
            <h3>{{ section.name }}</h3>
            <span class="bar-count">{{ section.bars }} Bars</span>
          </div>
          <div class="section-instructions" v-if="section.instructions">
            {{ section.instructions }}
          </div>
        </div>

        <div class="instruments-grid">
          <div v-for="inst in instruments" :key="inst" class="instrument-row">
            <div class="instrument-name">{{ inst }}</div>
            <div class="pattern-map">
              <div 
                v-for="bar in section.bars" 
                :key="bar" 
                class="bar-block"
                :class="getPatternClass(section, inst, bar)"
                @click="togglePattern(section, inst, bar)"
              >
                <!-- Visual indicator of pattern type -->
                <span class="pattern-icon">{{ getPatternIcon(section, inst, bar) }}</span>
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
        'Drums': { 1: 'play', 2: 'play', 3: 'play', 4: 'fill' },
        'Bass': { 1: 'rest', 2: 'rest', 3: 'play', 4: 'play' },
        'Guitar': { 1: 'play', 2: 'play', 3: 'play', 4: 'play' }
      }
    },
    {
      name: 'Verse 1',
      bars: 8,
      instructions: 'Tight groove',
      patterns: {
        'Drums': { 8: 'fill' }, // Default to 'play' if not specified? Or 'rest'? Let's assume 'play' is default or we store sparse.
                               // Better to store sparse for now.
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

const currentSectionIndex = ref(0)
const currentBar = ref(1) // 1-based index within section
const isPlaying = ref(false)
let playbackInterval = null

const currentSection = computed(() => {
  return song.value.sections[currentSectionIndex.value]
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
  const beatsPerBar = parseInt(song.value.timeSignature.split('/')[0])
  const msPerBar = msPerBeat * beatsPerBar
  
  playbackInterval = setInterval(() => {
    // Advance bar
    if (currentBar.value < currentSection.value.bars) {
      currentBar.value++
    } else {
      // Next section
      if (currentSectionIndex.value < song.value.sections.length - 1) {
        currentSectionIndex.value++
        currentBar.value = 1
        scrollToSection(currentSectionIndex.value)
      } else {
        // End of song
        pause()
        currentBar.value = 1
        currentSectionIndex.value = 0
        scrollToSection(0)
      }
    }
  }, msPerBar)
}

const pause = () => {
  isPlaying.value = false
  if (playbackInterval) {
    clearInterval(playbackInterval)
    playbackInterval = null
  }
}

// Helper to get pattern status
const getPatternClass = (section, instrument, bar) => {
  const pattern = section.patterns[instrument]?.[bar] || 'play' // Default to play? Or rest?
  return `pattern-${pattern}`
}

const getPatternIcon = (section, instrument, bar) => {
  const pattern = section.patterns[instrument]?.[bar] || 'play'
  switch (pattern) {
    case 'rest': return 'Job' // Using text/emoji for now
    case 'fill': return '⚡'
    case 'play': return '●'
    default: return '●'
  }
}

const togglePattern = (section, instrument, bar) => {
  if (!section.patterns[instrument]) {
    section.patterns[instrument] = {}
  }
  
  const current = section.patterns[instrument][bar] || 'play'
  const next = {
    'play': 'rest',
    'rest': 'fill',
    'fill': 'play'
  }[current]
  
  section.patterns[instrument][bar] = next
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

.section-title h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #2d3748;
}

.bar-count {
  font-size: 0.9rem;
  color: #718096;
  background: #edf2f7;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 10px;
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
  gap: 4px;
  flex-wrap: wrap;
}

.bar-block {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: #edf2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.8rem;
  color: #a0aec0;
}

.bar-block:hover {
  transform: translateY(-2px);
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
