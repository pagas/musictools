<template>
  <div class="performance-view">
    <!-- Song List View -->
    <div v-if="showSongList" class="song-list-view">
      <div class="song-list-header">
        <h1>My Songs</h1>
        <button class="btn-create-song" @click="createNewSong">
          + Create New Song
        </button>
      </div>

      <div class="songs-grid">
        <div v-for="songItem in songs" :key="songItem.id" class="song-card" @click="openSong(songItem.id)">
          <div class="song-card-header">
            <h3>{{ songItem.title }}</h3>
            <button class="btn-delete-song" @click.stop="deleteSong(songItem.id)" title="Delete Song">
              🗑️
            </button>
          </div>
          <div class="song-card-meta">
            <span>BPM: {{ songItem.bpm }}</span>
            <span>Time: {{ songItem.timeSignature }}</span>
            <span>{{ songItem.sections.length }} sections</span>
          </div>
          <div class="song-card-sections">
            <span v-for="(section, index) in songItem.sections.slice(0, 3)" :key="index" class="section-tag">
              {{ section.name }}
            </span>
            <span v-if="songItem.sections.length > 3" class="section-tag more">
              +{{ songItem.sections.length - 3 }} more
            </span>
          </div>
        </div>
      </div>

      <div v-if="songsLoading" class="empty-state">
        <p>Loading songs...</p>
      </div>
      <div v-else-if="songs.length === 0" class="empty-state">
        <p>No songs yet. Create your first song to get started!</p>
      </div>
    </div>

    <!-- Song Editor View -->
    <div v-else-if="!showSongList" class="song-editor-view">
      <!-- Header (not sticky) -->
      <div class="header-top">
        <div class="song-info">
          <button class="btn-back" @click="selectedSongId = null" title="Back to Songs">
            ← Back
          </button>
          <div v-if="song" class="header-content-row">




            <div class="song-info-content">

              <input v-model="song.title" class="song-title-input" placeholder="Song Title"
                @blur="autoSave(selectedSongId, song)" />
              <div class="meta-info">
                <span class="bpm">
                  <span class="label">BPM</span>
                  <input 
                    v-model.number="song.bpm" 
                    type="number" 
                    min="1" 
                    max="300" 
                    class="meta-value-input"
                    @blur="autoSave(selectedSongId, song)"
                    @keyup.enter="$event.target.blur()"
                  />
                </span>
                <span class="time-sig">
                  <span class="label">SIG</span>
                  <input 
                    v-model="song.timeSignature" 
                    type="text" 
                    pattern="\d+/\d+"
                    placeholder="4/4"
                    class="meta-value-input"
                    @blur="autoSave(selectedSongId, song)"
                    @keyup.enter="$event.target.blur()"
                  />
                </span>
              </div>
            </div>

            <!-- Instrument Filter -->
            <div class="instrument-filter" v-if="song">
              <div class="instrument-list">
                <button class="filter-btn" :class="{ active: selectedInstrument === null }"
                  @click="selectedInstrument = null">
                  All
                </button>
                <span v-for="inst in song.instruments || []" :key="inst" class="instrument-tag"
                  :class="{ active: selectedInstrument === inst }" @click="selectedInstrument = inst">
                  {{ inst }}
                  <button class="instrument-remove" @click.stop="removeInstrument(inst)" title="Remove instrument">
                    ×
                  </button>
                </span>
              </div>
              <div class="instrument-manager">
                <div class="instrument-dropdown-wrapper">
                  <select v-model="newInstrumentName" class="instrument-select" @change="addInstrument">
                    <option value="">Add Instrument...</option>
                    <option value="Drums">Drums</option>
                    <option value="Bass">Bass</option>
                    <option value="Guitar">Guitar</option>
                    <option value="Keys">Keys</option>
                    <option value="Piano">Piano</option>
                    <option value="Vocals">Vocals</option>
                    <option value="Strings">Strings</option>
                    <option value="Brass">Brass</option>
                    <option value="Percussion">Percussion</option>
                    <option value="Synth">Synth</option>
                  </select>
                  <input v-model="customInstrumentName" type="text" placeholder="Or type custom name"
                    class="instrument-input" @keyup.enter="addCustomInstrument" @blur="addCustomInstrument" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Sticky Header with Actions and Song Strip -->
      <div class="sticky-header-container" v-if="song">
        <div class="header-actions">
          <button class="btn-save" @click="manualSave" :disabled="saving || !song"
            :title="saving ? 'Saving...' : 'Save Song'">
            <span v-if="saving">💾 Saving...</span>
            <span v-else-if="lastSaved">✓ Saved</span>
            <span v-else>💾 Save</span>
          </button>
          <button class="btn-preview" @click="showPreview = true" title="Preview">
            👁️ Preview
          </button>
        </div>

        <!-- Song Strip Overview (Sticky) -->
        <div class="song-strip">
          <div v-for="(section, index) in song.sections" :key="index" class="strip-segment"
            :class="{ active: currentSectionIndex === index }" :style="{ flex: section.bars }">
            <span class="strip-name">{{ section.name }}</span>
          </div>
        </div>
      </div>

      <!-- Main Scrollable Body -->
      <div class="sections-container" ref="sectionsContainer" v-if="song">
        <div v-for="(section, index) in song.sections" :key="index" class="section-card" :id="'section-' + index"
          :class="{ active: currentSectionIndex === index }">
          <div class="section-header">
            <div class="section-title">
              <input v-model="section.name" class="name-input" placeholder="Section Name" />
              <div class="bar-control">
                <button class="bar-btn" @click="decrementBars(section)" :disabled="section.bars <= 1"
                  title="Remove Bar">−</button>
                <input v-model.number="section.bars" type="number" min="1" class="bar-input" />
                <button class="bar-btn" @click="incrementBars(section)" title="Add Bar">+</button>
                <span>Bars</span>
              </div>
            </div>
            <div class="section-actions">
              <div class="section-instructions" v-if="section.instructions">
                {{ section.instructions }}
              </div>
              <button class="btn-remove" @mousedown.stop="removeSection(index)" @touchstart.stop="removeSection(index)"
                title="Remove Section">
                🗑️
              </button>
            </div>
          </div>

          <div class="instruments-grid">
            <div v-for="inst in visibleInstruments" :key="inst" class="instrument-row">
              <div class="instrument-name">{{ inst }}</div>
              <div class="pattern-map">
                <div v-for="(row, rowIndex) in getBarRows(section.bars)" :key="rowIndex" class="bar-row">
                  <div v-for="bar in row" :key="bar" class="bar-container">
                    <div class="bar-label">{{ bar }}</div>
                    <div class="bar-beats">
                      <div v-for="beat in beatsPerBar" :key="beat" class="beat-block"
                        :class="getPatternClass(section, inst, bar, beat)"
                        @click="togglePattern(section, inst, bar, beat)" :title="`Bar ${bar}, Beat ${beat}`">
                        <span class="pattern-icon">{{ getPatternIcon(section, inst, bar, beat) }}</span>
                      </div>
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

    <!-- Preview Modal -->
    <div v-if="showPreview && song" class="preview-modal" @click.self="showPreview = false">
      <div class="preview-content">
        <div class="preview-header">
          <div class="preview-title">
            <h2>{{ song.title }}</h2>
            <div class="preview-meta">
              <span>BPM: {{ song.bpm }}</span>
              <span>Time: {{ song.timeSignature }}</span>
            </div>
          </div>
          <button class="btn-close" @click="showPreview = false" title="Close Preview">
            ✕
          </button>
        </div>

        <!-- Song Strip (Sticky) -->
        <div class="preview-song-strip" v-if="song">
          <div v-for="(section, index) in song.sections" :key="index" class="preview-strip-segment"
            :style="{ flex: section.bars }">
            <span class="preview-strip-name">{{ section.name }}</span>
            <span class="preview-strip-bars">{{ section.bars }} bars</span>
          </div>
        </div>

        <!-- Preview Sections Container -->
        <div class="preview-sections-container">
          <div v-for="(section, index) in song.sections" :key="index" class="preview-section-card">
            <div class="preview-instruments-grid">
              <div v-for="inst in visibleInstruments" :key="inst" class="preview-instrument-row">
                <div class="preview-instrument-header">
                  <h3 class="preview-section-name" v-if="inst === visibleInstruments[0]">{{ section.name }}</h3>
                  <div class="preview-section-meta" v-if="inst === visibleInstruments[0]">
                    <span>{{ section.bars }} bars</span>
                    <span v-if="section.instructions" class="preview-instructions">{{ section.instructions }}</span>
                  </div>
                  <div class="preview-instrument-name" v-if="visibleInstruments.length > 1">{{ inst }}</div>
                </div>
                <div class="preview-pattern-map">
                  <div v-for="(row, rowIndex) in getBarRows(section.bars)" :key="rowIndex" class="preview-bar-row">
                    <div v-for="bar in row" :key="bar" class="preview-bar-container">
                      <div class="preview-bar-beats">
                        <div v-for="beat in beatsPerBar" :key="beat" class="preview-beat-block"
                          :class="getPatternClass(section, inst, bar, beat)"
                          :title="`Bar ${bar}, Beat ${beat}: ${getPatternIcon(section, inst, bar, beat)}`">
                          <span class="preview-pattern-icon">{{ getPatternIcon(section, inst, bar, beat) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useSongs } from '../composables/useSongs'
import { useAuth } from '../composables/useAuth'

// Use Firestore for songs
const { songs, loading: songsLoading, loadSongs, createSong, updateSong, deleteSong: deleteSongFromFirestore } = useSongs()
const { user, isAuthenticated } = useAuth()

// Create default song data (without id, will be generated by Firestore)
const createDefaultSong = () => ({
  title: 'New Song',
  bpm: 120,
  timeSignature: '4/4',
  instruments: ['Drums', 'Bass', 'Guitar', 'Keys'],
  sections: [
    {
      name: 'Intro',
      bars: 4,
      instructions: '',
      patterns: {}
    }
  ]
})

const selectedSongId = ref(null)

// Auto-save debounce timer
let saveTimer = null
const AUTO_SAVE_DELAY = 2000 // 2 second delay

// Save state
const saving = ref(false)
const lastSaved = ref(false)
let savedTimeout = null

// Track if song is initialized (to prevent auto-save on initial load)
const songInitialized = ref(false)

// Track last saved data to prevent unnecessary saves
let lastSavedData = null

// Flag to prevent saves during Firestore updates
let isUpdatingFromFirestore = false

// Manual save function (immediate save)
const manualSave = async () => {
  if (!song.value || !selectedSongId.value || !isAuthenticated() || saving.value) {
    return
  }

  saving.value = true
  lastSaved.value = false

  try {
    // Clear any pending auto-save
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }

    // Remove metadata fields before saving
    const { id, userId, createdAt, updatedAt, ...dataToSave } = song.value
    const result = await updateSong(selectedSongId.value, dataToSave)

    if (result.success) {
      // Update last saved data
      lastSavedData = getSongDataForComparison(song.value)
      lastSaved.value = true
      // Clear the "Saved" indicator after 2 seconds
      if (savedTimeout) {
        clearTimeout(savedTimeout)
      }
      savedTimeout = setTimeout(() => {
        lastSaved.value = false
      }, 2000)
    } else {
      alert('Failed to save song: ' + (result.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Error saving song:', error)
    alert('Failed to save song: ' + error.message)
  } finally {
    saving.value = false
  }
}

// Helper to compare song data (excluding metadata)
const getSongDataForComparison = (songData) => {
  if (!songData) return null
  const { id, userId, createdAt, updatedAt, ...data } = songData
  return JSON.stringify(data)
}

// Auto-save function
const autoSave = (songId, songData) => {
  if (!songId || !isAuthenticated() || isUpdatingFromFirestore) return

  // Check if data actually changed
  const currentData = getSongDataForComparison(songData)
  if (currentData === lastSavedData) {
    return // No changes, skip save
  }

  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  // Set new timer
  saveTimer = setTimeout(async () => {
    if (saving.value || isUpdatingFromFirestore) return // Don't auto-save if manual save is in progress or Firestore update

    // Double-check data hasn't changed while waiting
    const currentDataCheck = getSongDataForComparison(songData)
    if (currentDataCheck === lastSavedData) {
      return // Data already saved, skip
    }

    try {
      saving.value = true
      // Remove metadata fields before saving
      const { id, userId, createdAt, updatedAt, ...dataToSave } = songData
      const result = await updateSong(songId, dataToSave)

      if (result.success) {
        // Update last saved data
        lastSavedData = getSongDataForComparison(songData)
        lastSaved.value = true
        // Clear the "Saved" indicator after 2 seconds
        if (savedTimeout) {
          clearTimeout(savedTimeout)
        }
        savedTimeout = setTimeout(() => {
          lastSaved.value = false
        }, 2000)
      }
    } catch (error) {
      console.error('Error auto-saving song:', error)
    } finally {
      saving.value = false
    }
  }, AUTO_SAVE_DELAY)
}

// Show song list when no song is selected
const showSongList = computed(() => selectedSongId.value === null)

// Current song (computed from selectedSongId)
const song = computed({
  get: () => {
    if (!selectedSongId.value) return null
    return songs.value.find(s => s.id === selectedSongId.value) || null
  },
  set: (value) => {
    if (!selectedSongId.value) return
    const index = songs.value.findIndex(s => s.id === selectedSongId.value)
    if (index !== -1) {
      songs.value[index] = value
      // Auto-save when song is updated
      autoSave(selectedSongId.value, value)
    }
  }
})

// Watch for song selection to reset initialization flag
watch(() => selectedSongId.value, (newId, oldId) => {
  if (newId !== oldId) {
    // Reset initialization flag when song changes
    songInitialized.value = false
    // Reset selected instrument when switching songs
    selectedInstrument.value = null
    // Set flag after a short delay to allow song to load
    setTimeout(() => {
      if (song.value) {
        songInitialized.value = true
        // Restore selected instrument from song metadata
        isRestoringInstrument = true
        if (song.value.metadata && song.value.metadata.selectedInstrument) {
          const savedInstrument = song.value.metadata.selectedInstrument
          // Only restore if the instrument still exists in the song's instruments list
          if (!savedInstrument || song.value.instruments?.includes(savedInstrument)) {
            selectedInstrument.value = savedInstrument
          } else {
            selectedInstrument.value = null
          }
        } else {
          selectedInstrument.value = null
        }
        // Reset flag after restoration
        setTimeout(() => {
          isRestoringInstrument = false
        }, 50)
      }
    }, 100)
  }
})

// Watch for changes in song properties and auto-save (only after initialization)
watch(() => song.value?.title, () => {
  if (song.value && selectedSongId.value && songInitialized.value) {
    autoSave(selectedSongId.value, song.value)
  }
}, { flush: 'post' })

watch(() => song.value?.bpm, () => {
  if (song.value && selectedSongId.value && songInitialized.value) {
    autoSave(selectedSongId.value, song.value)
  }
}, { flush: 'post' })

watch(() => song.value?.timeSignature, () => {
  if (song.value && selectedSongId.value && songInitialized.value) {
    autoSave(selectedSongId.value, song.value)
  }
}, { flush: 'post' })

watch(() => song.value?.sections, () => {
  if (song.value && selectedSongId.value && songInitialized.value) {
    autoSave(selectedSongId.value, song.value)
  }
}, { deep: true, flush: 'post' })

watch(() => song.value?.instruments, () => {
  if (song.value && selectedSongId.value && songInitialized.value) {
    autoSave(selectedSongId.value, song.value)
  }
}, { deep: true, flush: 'post' })

const selectedInstrument = ref(null)

// Flag to prevent saving when restoring from song data
let isRestoringInstrument = false

// Watch for selectedInstrument changes and save to song
watch(selectedInstrument, (newInstrument) => {
  // Don't save if we're restoring from song data
  if (isRestoringInstrument) return
  
  if (song.value && selectedSongId.value && songInitialized.value) {
    // Save selected instrument to song data
    if (!song.value.metadata) {
      song.value.metadata = {}
    }
    song.value.metadata.selectedInstrument = newInstrument
    // Auto-save the change
    autoSave(selectedSongId.value, song.value)
  }
})

// Instrument management
const newInstrumentName = ref('')
const customInstrumentName = ref('')

// Get instruments from song, fallback to default
const instruments = computed(() => {
  if (!song.value) return []
  return song.value.instruments || ['Drums', 'Bass', 'Guitar', 'Keys']
})

const visibleInstruments = computed(() => {
  if (selectedInstrument.value) {
    return [selectedInstrument.value]
  }
  return instruments.value
})

// Add instrument from dropdown
const addInstrument = () => {
  if (!song.value || !newInstrumentName.value) return

  if (!song.value.instruments) {
    song.value.instruments = []
  }

  if (!song.value.instruments.includes(newInstrumentName.value)) {
    song.value.instruments.push(newInstrumentName.value)
    newInstrumentName.value = '' // Reset dropdown
  }
}

// Add custom instrument
const addCustomInstrument = () => {
  if (!song.value || !customInstrumentName.value.trim()) return

  const instrumentName = customInstrumentName.value.trim()

  if (!song.value.instruments) {
    song.value.instruments = []
  }

  if (!song.value.instruments.includes(instrumentName)) {
    song.value.instruments.push(instrumentName)
    customInstrumentName.value = '' // Clear input
  }
}

// Remove instrument
const removeInstrument = (instrumentName) => {
  if (!song.value || !song.value.instruments) return

  const index = song.value.instruments.indexOf(instrumentName)
  if (index > -1) {
    song.value.instruments.splice(index, 1)

    // Clear selection if removed instrument was selected
    if (selectedInstrument.value === instrumentName) {
      selectedInstrument.value = null
    }

    // Clean up patterns for removed instrument in all sections
    song.value.sections.forEach(section => {
      if (section.patterns && section.patterns[instrumentName]) {
        delete section.patterns[instrumentName]
      }
    })
  }
}

const currentSectionIndex = ref(0)
const currentBar = ref(1) // 1-based index within section
const currentBeat = ref(1) // 1-based index within bar
const isPlaying = ref(false)
const showPreview = ref(false)
let playbackInterval = null

const currentSection = computed(() => {
  if (!song.value) return null
  return song.value.sections[currentSectionIndex.value]
})

// Calculate beats per bar from time signature
const beatsPerBar = computed(() => {
  if (!song.value) return 4
  const [beats] = song.value.timeSignature.split('/').map(Number)
  return beats || 4 // Default to 4 if parsing fails
})

// Get bars per row from time signature (use numerator)
const barsPerRow = computed(() => {
  if (!song.value) return 4
  const [beats] = song.value.timeSignature.split('/').map(Number)
  return beats || 4 // Default to 4 if parsing fails
})

// Group bars into rows based on time signature
const getBarRows = (totalBars) => {
  const bars = Array.from({ length: totalBars }, (_, i) => i + 1)
  const rows = []
  for (let i = 0; i < bars.length; i += barsPerRow.value) {
    rows.push(bars.slice(i, i + barsPerRow.value))
  }
  return rows
}

const togglePlay = () => {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

const play = () => {
  if (!song.value) return
  isPlaying.value = true
  const msPerBeat = 60000 / song.value.bpm

  playbackInterval = setInterval(() => {
    if (!song.value || !currentSection.value) {
      pause()
      return
    }
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
  // Set up observer if a song is already selected
  if (song.value) {
    setupObserver()
  }
})

// Cleanup save timer on unmount
onUnmounted(() => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
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
watch(() => song.value?.sections?.length, async () => {
  if (!song.value) return
  await nextTick()
  setupObserver()
})

// Watch for song selection to set up observer
watch(() => selectedSongId.value, async () => {
  if (selectedSongId.value) {
    await nextTick()
    setupObserver()
  } else {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }
})

// Helper function to set up the intersection observer
const setupObserver = () => {
  if (!song.value) return

  if (observer) {
    observer.disconnect()
  }

  const options = {
    root: null, // Use viewport instead of container
    threshold: 0.3,
    rootMargin: '-20% 0px -70% 0px' // Trigger when section is in upper portion of viewport
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

  document.querySelectorAll('.section-card').forEach((section) => {
    observer.observe(section)
  })
}

const addSection = () => {
  if (!song.value) return
  song.value.sections.push({
    name: 'New Section',
    bars: 4,
    instructions: '',
    patterns: {}
  })
  // Auto-save is handled by watcher
}

const removeSection = (index) => {
  if (!song.value) return
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

// Song management functions
const createNewSong = async () => {
  if (!isAuthenticated()) {
    alert('Please sign in to create songs')
    return
  }

  const newSongData = createDefaultSong()
  const result = await createSong(newSongData)

  if (result.success) {
    selectedSongId.value = result.id
    resetPlayback()
    // Mark as initialized after creation
    songInitialized.value = true
    // Wait for song to be loaded from Firestore before setting lastSavedData
    setTimeout(() => {
      if (song.value) {
        lastSavedData = getSongDataForComparison(song.value)
        isUpdatingFromFirestore = false
      }
    }, 300)
  } else {
    alert('Failed to create song: ' + (result.error || 'Unknown error'))
  }
}

const openSong = (songId) => {
  selectedSongId.value = songId
  resetPlayback()
}

const deleteSong = async (songId) => {
  if (!window.confirm('Are you sure you want to delete this song?')) {
    return
  }

  const result = await deleteSongFromFirestore(songId)

  if (result.success) {
    if (selectedSongId.value === songId) {
      selectedSongId.value = null
    }
  } else {
    alert('Failed to delete song: ' + (result.error || 'Unknown error'))
  }
}

// Load songs when user is authenticated
watch(() => isAuthenticated(), (authenticated) => {
  if (authenticated) {
    loadSongs()
  } else {
    selectedSongId.value = null
    songInitialized.value = false
  }
}, { immediate: true })

// Load songs on mount if already authenticated
onMounted(() => {
  if (isAuthenticated()) {
    loadSongs()
  }
})

// Watch for when song is loaded from Firestore and mark as initialized
watch(() => song.value, (newSong, oldSong) => {
  if (newSong && newSong !== oldSong && selectedSongId.value) {
    // Mark that we're updating from Firestore to prevent save loops
    isUpdatingFromFirestore = true

    // Ensure instruments array exists, initialize with defaults if missing
    if (!newSong.instruments || newSong.instruments.length === 0) {
      newSong.instruments = ['Drums', 'Bass', 'Guitar', 'Keys']
    }

    // Update last saved data to match current song
    lastSavedData = getSongDataForComparison(newSong)

    // Song loaded, mark as initialized after a brief delay
    setTimeout(() => {
      if (song.value && selectedSongId.value) {
        songInitialized.value = true
        // Allow saves again after initialization
        setTimeout(() => {
          isUpdatingFromFirestore = false
        }, 500)
      }
    }, 200)
  } else if (!newSong) {
    songInitialized.value = false
    lastSavedData = null
    isUpdatingFromFirestore = false
  }
}, { immediate: true })
</script>

<style scoped>
.performance-view {
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  position: relative;
}

/* Sticky Header */
.sticky-header {
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  padding: 0;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 24px;
  gap: 16px;
}

.header-content-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex: 1;
}


.btn-save {
  padding: 8px 16px;
  background: #48bb78;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.btn-save:hover:not(:disabled) {
  background: #38a169;
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-preview {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-preview:hover {
  background: #5568d3;
  transform: translateY(-1px);
}

.btn-back {
  padding: 6px 12px;
  background: #f0f2f5;
  color: #4a5568;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 12px;
}

.btn-back:hover {
  background: #e2e8f0;
  color: #2d3748;
}

/* Song List View */
.song-list-view {
  flex: 1;
  width: 100%;
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.song-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.song-list-header h1 {
  margin: 0;
  font-size: 2rem;
  color: #2d3748;
}

.btn-create-song {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create-song:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.songs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  flex: 1;
  align-items: start;
}

.song-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  align-self: start;
}

.song-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.song-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.song-card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2d3748;
  flex: 1;
  line-height: 1.3;
}

.btn-delete-song {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.2s;
  padding: 4px;
  border-radius: 4px;
}

.btn-delete-song:hover {
  opacity: 1;
  background: #fff5f5;
  transform: scale(1.1);
}

.song-card-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.8rem;
  color: #718096;
  flex-wrap: wrap;
}

.song-card-sections {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.section-tag {
  background: #eef2ff;
  color: #667eea;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.4;
}

.section-tag.more {
  background: #f7fafc;
  color: #718096;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
  font-size: 1.1rem;
}

.song-editor-view {
  display: flex;
  flex-direction: column;
}

.song-info h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  color: #333;
}

.song-title-input {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  background: transparent;
  width: 100%;
  max-width: 400px;
  transition: all 0.2s;
  margin: 0 0 8px 0;
}

.song-title-input:focus {
  outline: none;
  border-color: #667eea;
  background: #f7fafc;
}

.song-title-input:hover {
  border-color: #e2e8f0;
}

.meta-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.bpm,
.time-sig {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f5f7fa;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}

.meta-value-input {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  border: 2px solid transparent;
  border-radius: 4px;
  padding: 2px 6px;
  background: transparent;
  width: 50px;
  text-align: center;
  transition: all 0.2s;
  font-family: inherit;
}

.meta-value-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.meta-value-input:hover {
  border-color: #e2e8f0;
}

.meta-value-input[type="number"] {
  -moz-appearance: textfield;
}

.meta-value-input[type="number"]::-webkit-outer-spin-button,
.meta-value-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.label {
  color: #888;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}


.song-info-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.header-content-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex: 1;
  width: 100%;
}

.song-info-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.instrument-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: none;
}

.instrument-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.instrument-manager {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.instrument-dropdown-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.instrument-select {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 0.85rem;
  cursor: pointer;
  min-width: 150px;
}

.instrument-input {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 0.85rem;
  max-width: 200px;
}

.instrument-input:focus {
  outline: none;
  border-color: #667eea;
}

.instrument-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.instrument-tag:hover {
  background: #f0f2f5;
  color: #333;
}

.instrument-tag.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.instrument-remove {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  opacity: 0.7;
}

.instrument-tag:hover .instrument-remove {
  opacity: 1;
}

.instrument-remove:hover {
  background: rgba(0, 0, 0, 0.1);
}

.instrument-tag.active .instrument-remove:hover {
  background: rgba(255, 255, 255, 0.2);
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

/* Sticky Header Container */
.sticky-header-container {
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 100;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

/* Song Strip */
.song-strip {
  display: flex;
  height: 40px;
  width: 100%;
  background: #e0e0e0;
  overflow: hidden;
  margin-top: 0;
}

.strip-segment {
  border-right: 1px solid rgba(255, 255, 255, 0.3);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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

.name-input:hover,
.name-input:focus {
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
  background: rgba(255, 255, 255, 0.5);
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
  background: rgba(255, 255, 255, 0.8);
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
  background: rgba(255, 255, 255, 0.5);
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
  flex-direction: column;
  gap: 12px;
}

.bar-row {
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

/* Preview Modal */
.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-content {
  width: 100%;
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  background: #fff;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.preview-title h2 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  color: #333;
}

.preview-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: #666;
}

.btn-close {
  width: 40px;
  height: 40px;
  border: none;
  background: #f0f2f5;
  border-radius: 50%;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #e0e0e0;
  color: #333;
}

.preview-song-strip {
  position: sticky;
  top: 0;
  display: flex;
  height: 40px;
  width: 100%;
  background: #e0e0e0;
  overflow-x: auto;
  z-index: 5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.preview-strip-segment {
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  background: #d1d5db;
  white-space: nowrap;
  overflow: hidden;
  padding: 2px 6px;
  min-width: 60px;
}

.preview-strip-name {
  font-weight: 700;
  margin-bottom: 1px;
  font-size: 0.7rem;
}

.preview-strip-bars {
  font-size: 0.65rem;
  color: #888;
  font-weight: 400;
}

.preview-sections-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scroll-behavior: smooth;
}

.preview-section-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #667eea;
}

.preview-instruments-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-instrument-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-instrument-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  flex-shrink: 0;
}

.preview-section-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #2d3748;
}

.preview-section-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.75rem;
  color: #718096;
}

.preview-instructions {
  font-style: italic;
  color: #718096;
  background: #fffbeb;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #fef3c7;
  font-size: 0.7rem;
}

.preview-instrument-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #4a5568;
  min-width: 80px;
}

.preview-pattern-map {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-bar-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.preview-bar-container {
  display: flex;
  align-items: center;
}

.preview-bar-beats {
  display: flex;
  gap: 2px;
  background: #f7fafc;
  padding: 2px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.preview-beat-block {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  background: #edf2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #a0aec0;
  transition: all 0.15s;
}

.preview-pattern-icon {
  font-size: 0.75rem;
}

.preview-beat-block.pattern-play {
  background: #c3dafe;
  color: #4c51bf;
}

.preview-beat-block.pattern-rest {
  background: #f7fafc;
  color: #cbd5e0;
  border: 2px dashed #cbd5e0;
}

.preview-beat-block.pattern-fill {
  background: #fed7e2;
  color: #b83280;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .preview-header {
    padding: 10px 12px;
  }

  .preview-title h2 {
    font-size: 1.1rem;
  }

  .preview-sections-container {
    padding: 8px;
  }

  .preview-section-card {
    padding: 10px;
    margin-bottom: 8px;
  }

  .preview-instrument-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .preview-instrument-header {
    min-width: auto;
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }

  .preview-section-name {
    font-size: 0.9rem;
  }

  .preview-section-meta {
    font-size: 0.7rem;
    gap: 6px;
    flex-wrap: wrap;
  }

  .preview-instrument-name {
    min-width: auto;
    font-size: 0.8rem;
  }

  .preview-pattern-map {
    width: 100%;
  }

  .preview-bar-row {
    gap: 3px;
  }

  .preview-bar-beats {
    gap: 1px;
    padding: 1px;
  }

  .preview-beat-block {
    width: 20px;
    height: 20px;
    font-size: 0.65rem;
  }

  .preview-pattern-icon {
    font-size: 0.65rem;
  }
}
</style>
