<template>
  <!-- Preview View (Full Screen) - Teleported to body -->
  <Teleport to="body">
    <div v-if="isShowingPreview" class="preview-view">
    <div class="preview-header">
      <div class="preview-title">
        <h2>{{ previewSong.title }}</h2>
        <div class="preview-meta">
          <span>BPM: {{ previewSong.bpm }}</span>
          <span>Time: {{ previewSong.timeSignature }}</span>
        </div>
      </div>
      <div class="preview-header-actions">
        <button class="btn-close" @click="publicPreview ? goToHome() : closePreview()" :title="publicPreview ? 'Close' : 'Close Preview'">
          ✕
        </button>
      </div>
      </div>

      <!-- Preview body: strip + sections (row on mobile) -->
      <div class="preview-body">
      <!-- Song Strip (horizontal on desktop, vertical on mobile) -->
      <div class="preview-song-strip" v-if="previewSong">
      <div 
        v-for="(section, sectionIndex) in previewSong.sections" 
        :key="sectionIndex" 
        class="preview-strip-segment"
        :style="{ flex: section.bars }"
        @click="scrollToPreviewSection(sectionIndex)"
      >
        <div class="preview-strip-section-header">
          <span class="preview-strip-name">{{ section.name }}</span>
          <span class="preview-strip-bars">{{ formatBarsAsPhrasesAbbr(section.bars, previewSong.timeSignature) }}</span>
        </div>
        <div class="preview-strip-bars-container" :class="{ 'preview-strip-bars-vertical': section.bars > 2 }">
          <template v-for="bar in Array.from({ length: section.bars }, (_, i) => i + 1)" :key="bar">
            <div 
              v-if="bar > 1 && (bar - 1) % barsPerPhrase === 0"
              class="preview-strip-phase-marker"
              :title="`Phase marker at bar ${bar}`"
            ></div>
            <div 
              class="preview-strip-bar-segment"
              :class="getBarPatternClass(section, bar)"
              :style="{ flex: 1 }"
              :title="`Bar ${bar}: ${getBarPatternLabel(section, bar)}`"
            ></div>
          </template>
        </div>
      </div>
    </div>

    <!-- Preview Sections Container -->
    <div class="preview-sections-container">
      <div v-for="(section, index) in previewSong.sections" :key="index" class="preview-section-card" :class="{ 'preview-section-card-active': currentPreviewSectionIndex === index }" :id="'preview-section-' + index">
        <div class="preview-instruments-grid">
          <div v-for="inst in previewVisibleInstruments" :key="inst" class="preview-instrument-row">
            <div class="preview-instrument-header">
              <h3 class="preview-section-name" v-if="inst === previewVisibleInstruments[0]">{{ section.name }}</h3>
              <div class="preview-section-meta" v-if="inst === previewVisibleInstruments[0]">
                <span>{{ formatBarsAsPhrases(section.bars, previewSong.timeSignature) }}</span>
                <span v-if="section.instructions" class="preview-instructions">{{ section.instructions }}</span>
              </div>
              <div class="preview-instrument-name" v-if="previewVisibleInstruments.length > 1">{{ inst }}</div>
            </div>
            <div class="preview-pattern-map">
              <div v-for="(row, rowIndex) in getBarRows(section.bars)" :key="rowIndex" class="preview-bar-row">
                <span class="preview-bar-row-number">{{ rowIndex + 1 }}</span>
                <div v-for="bar in row" :key="bar" class="preview-bar-container">
                  <div class="preview-bar-beats">
                    <div v-for="beat in getVisibleBeats(section, bar)" :key="beat" class="preview-beat-block"
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
  </Teleport>

  <div v-if="!isShowingPreview" class="performance-view">
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
          <div class="header-top-row">
            <button class="btn-back" @click="goToSongList" title="Back to Songs">
              ← Back
            </button>
            <button v-if="song" class="btn-share" @click="copyShareLink" :disabled="shareLoading" :title="shareLinkCopied ? 'Copied!' : 'Copy public preview link'">
              {{ shareLinkCopied ? '✓ Copied!' : (shareLoading ? '…' : 'Share') }}
            </button>
          </div>
          <div v-if="song" class="header-content-row">




            <div class="song-info-content">

              <input v-model="song.title" class="song-title-input" placeholder="Song Title" />
              <div class="meta-info">
                <span class="bpm">
                  <span class="label">BPM</span>
                  <input 
                    v-model.number="song.bpm" 
                    type="number" 
                    min="1" 
                    max="300" 
                    class="meta-value-input"
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
                    @keyup.enter="$event.target.blur()"
                  />
                </span>
              </div>
            </div>

            <!-- Instrument Manager (add/remove instruments) -->
            <div class="instrument-filter" v-if="song">
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
          <button class="btn-save" @click="manualSave" :disabled="saving || !song"
            :title="saving ? 'Saving...' : 'Save Song'">
            <span v-if="saving">💾 Saving...</span>
            <span v-else-if="lastSaved">✓ Saved</span>
            <span v-else>💾 Save</span>
          </button>
          <button class="btn-preview" @click="openPreview" title="Preview">
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
                    <div class="bar-header">
                      <div class="bar-label">{{ bar }}</div>
                      <div class="bar-menu-wrapper">
                        <button 
                          class="bar-menu-btn" 
                          @click.stop="toggleBarMenu(section, inst, bar)"
                          :title="`Bar ${bar} options`"
                        >
                          ⋯
                        </button>
                        <div 
                          v-if="openBarMenu?.section === section && openBarMenu?.instrument === inst && openBarMenu?.bar === bar"
                          class="bar-menu-dropdown"
                          @click.stop
                        >
                          <button 
                            class="bar-menu-item" 
                            @click="setBarPattern(section, inst, bar, 'play')"
                          >
                            <span class="menu-icon">●</span> Set all to Play
                          </button>
                          <button 
                            class="bar-menu-item" 
                            @click="setBarPattern(section, inst, bar, 'rest')"
                          >
                            <span class="menu-icon">—</span> Set all to Rest
                          </button>
                          <button 
                            class="bar-menu-item" 
                            @click="setBarPattern(section, inst, bar, 'fill')"
                          >
                            <span class="menu-icon">⚡</span> Set all to Fill
                          </button>
                          <div class="bar-menu-divider"></div>
                          <button 
                            class="bar-menu-item bar-menu-item-danger" 
                            @click.stop="deleteLastBeat(section, inst, bar)"
                          >
                            <span class="menu-icon">✂️</span> Delete Last Beat
                          </button>
                          <div class="bar-menu-divider"></div>
                          <button 
                            class="bar-menu-item bar-menu-item-danger" 
                            @click="deleteBar(section, bar)"
                          >
                            <span class="menu-icon">🗑️</span> Delete Bar
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="bar-beats">
                      <div v-for="beat in getVisibleBeats(section, bar)" :key="beat" class="beat-block"
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

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSongs } from '../composables/useSongs'
import { useAuth } from '../composables/useAuth'
import { createShare } from '../composables/useSharedSongs'

const props = defineProps({
  publicPreview: { type: Boolean, default: false },
  sharedSong: { type: Object, default: null }
})

const router = useRouter()
const route = useRoute()

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

// Initialize selectedSongId from route query
const selectedSongId = ref(route.query.songId || null)
let isUpdatingFromRoute = false

// Computed property for showPreview from route
const showPreview = computed(() => route.query.preview === 'true')

// Public preview: show when in-app preview (showPreview + song) or public share (publicPreview + sharedSong)
const isShowingPreview = computed(() =>
  (props.publicPreview && props.sharedSong) || (showPreview.value && song.value)
)
const previewSong = computed(() => {
  if (props.publicPreview && props.sharedSong) return props.sharedSong
  return song.value
})
const previewVisibleInstruments = computed(() => {
  if (!previewSong.value) return []
  if (props.publicPreview) {
    const instruments = previewSong.value.instruments || ['Drums', 'Bass', 'Guitar', 'Keys']
    const sharedInstrument = previewSong.value.metadata?.selectedInstrument
    if (sharedInstrument && instruments.includes(sharedInstrument)) {
      return [sharedInstrument]
    }
    return instruments
  }
  return visibleInstruments.value
})

// Share link state
const shareLoading = ref(false)
const shareLinkCopied = ref(false)
let shareCopiedTimeout = null

const copyShareLink = async () => {
  if (!song.value || shareLoading.value) return
  shareLoading.value = true
  shareLinkCopied.value = false
  try {
    const selectedInstrumentToShare = selectedInstrument.value ?? song.value.metadata?.selectedInstrument
    const { success, shareId, error } = await createShare(song.value, selectedInstrumentToShare)
    if (!success || !shareId) {
      alert(error || 'Could not create share link')
      return
    }
    const url = `${window.location.origin}/p/${shareId}`
    await navigator.clipboard.writeText(url)
    shareLinkCopied.value = true
    if (shareCopiedTimeout) clearTimeout(shareCopiedTimeout)
    shareCopiedTimeout = setTimeout(() => { shareLinkCopied.value = false }, 3000)
  } catch (e) {
    alert('Failed to copy link')
  } finally {
    shareLoading.value = false
  }
}

const goToHome = () => {
  router.push('/')
}

// Bar menu state
const openBarMenu = ref(null) // { section, instrument, bar } or null

// Save state
const saving = ref(false)
const lastSaved = ref(false)
let savedTimeout = null

// Track if song is initialized
const songInitialized = ref(false)

// Manual save function (immediate save)
const manualSave = async () => {
  if (!song.value || !selectedSongId.value || !isAuthenticated() || saving.value) {
    return
  }

  saving.value = true
  lastSaved.value = false

  try {
    // Remove metadata fields before saving
    const { id, userId, createdAt, updatedAt, ...dataToSave } = song.value
    const result = await updateSong(selectedSongId.value, dataToSave)

    if (result.success) {
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
    }
  }
})

// Watch route changes to update selectedSongId
watch(() => route.query, (query) => {
  isUpdatingFromRoute = true
  
  if (query.songId && query.songId !== selectedSongId.value) {
    selectedSongId.value = query.songId
  } else if (!query.songId && selectedSongId.value) {
    selectedSongId.value = null
  }
  
  setTimeout(() => {
    isUpdatingFromRoute = false
  }, 100)
}, { immediate: true })

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
const currentPreviewSectionIndex = ref(-1)
const currentBar = ref(1) // 1-based index within section
const currentBeat = ref(1) // 1-based index within bar
const isPlaying = ref(false)
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

// Get bars per phrase from time signature (use numerator - typically 4 bars per phrase in 4/4)
// In preview mode use previewSong so strip phase markers match the shared song
const barsPerPhrase = computed(() => {
  const s = isShowingPreview.value ? previewSong.value : song.value
  if (!s) return 4
  const [beats] = (s.timeSignature || '4/4').split('/').map(Number)
  return beats || 4
})

// Format bar count as "N phrases" or "N phrases + M" (e.g. 4/4: 4 bars per phrase → 8 bars = 2 phrases, 16 bars = 4 phrases)
const formatBarsAsPhrases = (bars, timeSignature) => {
  if (bars == null || bars < 1) return '0 phrases'
  const beats = (timeSignature || '4/4').split('/').map(Number)[0] || 4
  const barsPerPhraseDisplay = Math.max(1, beats)
  const fullPhrases = Math.floor(bars / barsPerPhraseDisplay)
  const extraBars = bars % barsPerPhraseDisplay
  if (fullPhrases === 0) return `${extraBars} bar${extraBars !== 1 ? 's' : ''}`
  if (extraBars === 0) return `${fullPhrases} phrase${fullPhrases !== 1 ? 's' : ''}`
  return `${fullPhrases} phrase${fullPhrases !== 1 ? 's' : ''} + ${extraBars}`
}

// Abbreviated form for strip: "2 phr", "3 phr + 1", "1 bar"
const formatBarsAsPhrasesAbbr = (bars, timeSignature) => {
  if (bars == null || bars < 1) return '0 phr'
  const beats = (timeSignature || '4/4').split('/').map(Number)[0] || 4
  const barsPerPhraseDisplay = Math.max(1, beats)
  const fullPhrases = Math.floor(bars / barsPerPhraseDisplay)
  const extraBars = bars % barsPerPhraseDisplay
  if (fullPhrases === 0) return `${extraBars} bar${extraBars !== 1 ? 's' : ''}`
  if (extraBars === 0) return `${fullPhrases} phr`
  return `${fullPhrases} phr + ${extraBars}`
}

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

// Get the overall pattern for a bar across visible instruments (preview uses previewVisibleInstruments)
const getBarPattern = (section, bar) => {
  const instrumentsToUse = isShowingPreview.value ? previewVisibleInstruments.value : visibleInstruments.value
  if (!section.patterns || instrumentsToUse.length === 0) return 'play'

  const beats = (isShowingPreview.value && previewSong.value)
    ? (() => { const [b] = (previewSong.value.timeSignature || '4/4').split('/').map(Number); return b || 4 })()
    : beatsPerBar.value
  const patterns = []

  for (const inst of instrumentsToUse) {
    for (let beat = 1; beat <= beats; beat++) {
      const patternKey = `${bar}-${beat}`
      const pattern = section.patterns[inst]?.[patternKey] || 'play'
      patterns.push(pattern)
    }
  }

  if (patterns.every(p => p === 'rest')) return 'rest'
  if (patterns.some(p => p === 'fill')) return 'fill'
  return 'play'
}

// Get CSS class for bar pattern
const getBarPatternClass = (section, bar) => {
  const pattern = getBarPattern(section, bar)
  return `bar-pattern-${pattern}`
}

// Get label for bar pattern
const getBarPatternLabel = (section, bar) => {
  const pattern = getBarPattern(section, bar)
  switch (pattern) {
    case 'rest': return 'Rest'
    case 'fill': return 'Fill'
    case 'play': return 'Play'
    default: return 'Play'
  }
}

// Toggle bar menu dropdown
const toggleBarMenu = (section, instrument, bar) => {
  if (openBarMenu.value?.section === section && openBarMenu.value?.instrument === instrument && openBarMenu.value?.bar === bar) {
    openBarMenu.value = null
  } else {
    openBarMenu.value = { section, instrument, bar }
  }
}

// Close bar menu when clicking outside
const closeBarMenu = (event) => {
  // Don't close if clicking inside the menu
  if (event && event.target) {
    const target = event.target
    if (target.closest('.bar-menu-dropdown')) {
      return
    }
  }
  openBarMenu.value = null
}

// Set all beats in a bar to a specific pattern
const setBarPattern = (section, instrument, bar, pattern) => {
  if (!song.value) return
  
  if (!section.patterns) {
    section.patterns = {}
  }
  if (!section.patterns[instrument]) {
    section.patterns[instrument] = {}
  }
  
  // Set all beats in the bar to the specified pattern
  for (let beat = 1; beat <= beatsPerBar.value; beat++) {
    const patternKey = `${bar}-${beat}`
    section.patterns[instrument][patternKey] = pattern
  }
  
  // Close menu
  openBarMenu.value = null
}

// Delete a bar from a section
const deleteBar = (section, bar, skipConfirm = false) => {
  if (!song.value || section.bars <= 1) return
  
  if (!skipConfirm && !window.confirm(`Are you sure you want to delete bar ${bar}? This will remove the bar and shift all subsequent bars.`)) {
    openBarMenu.value = null
    return
  }
  
  // Remove patterns for the deleted bar for all instruments
  if (section.patterns) {
    for (const instrument in section.patterns) {
      if (section.patterns[instrument]) {
        // Remove patterns for the deleted bar
        for (let beat = 1; beat <= beatsPerBar.value; beat++) {
          const patternKey = `${bar}-${beat}`
          delete section.patterns[instrument][patternKey]
        }
        
        // Renumber all bars after the deleted one
        for (let b = bar + 1; b <= section.bars; b++) {
          for (let beat = 1; beat <= beatsPerBar.value; beat++) {
            const oldKey = `${b}-${beat}`
            const newKey = `${b - 1}-${beat}`
            if (section.patterns[instrument][oldKey] !== undefined) {
              section.patterns[instrument][newKey] = section.patterns[instrument][oldKey]
              delete section.patterns[instrument][oldKey]
            }
          }
        }
      }
    }
  }
  
  // Remove deletedBeats entry for this bar
  if (section.deletedBeats && section.deletedBeats[bar]) {
    delete section.deletedBeats[bar]
  }
  
  // Renumber deletedBeats entries for subsequent bars
  for (let b = bar + 1; b <= section.bars; b++) {
    if (section.deletedBeats && section.deletedBeats[b]) {
      section.deletedBeats[b - 1] = section.deletedBeats[b]
      delete section.deletedBeats[b]
    }
  }
  
  // Decrease bar count
  section.bars--
  
  // Close menu
  openBarMenu.value = null
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

// Get visible beats for a bar (excluding deleted beats)
const getVisibleBeats = (section, bar) => {
  if (!section.deletedBeats) {
    section.deletedBeats = {}
  }
  const deletedBeats = section.deletedBeats[bar] || []
  return Array.from({ length: beatsPerBar.value }, (_, i) => i + 1).filter(beat => !deletedBeats.includes(beat))
}

// Delete the last beat from a bar (completely removes it)
const deleteLastBeat = (section, instrument, bar) => {
  if (!song.value) return
  
  // Initialize deletedBeats if it doesn't exist
  if (!section.deletedBeats) {
    section.deletedBeats = {}
  }
  if (!section.deletedBeats[bar]) {
    section.deletedBeats[bar] = []
  }
  
  // Get the last visible beat (or last beat if none deleted)
  const visibleBeats = getVisibleBeats(section, bar)
  const lastBeat = visibleBeats.length > 0 ? visibleBeats[visibleBeats.length - 1] : beatsPerBar.value
  
  // Mark this beat as deleted
  if (!section.deletedBeats[bar].includes(lastBeat)) {
    section.deletedBeats[bar].push(lastBeat)
  }
  
  // Also remove pattern data for all instruments
  if (section.patterns) {
    for (const inst in section.patterns) {
      if (section.patterns[inst]) {
        const patternKey = `${bar}-${lastBeat}`
        delete section.patterns[inst][patternKey]
      }
    }
  }
  
  // Check if all beats are now deleted - if so, remove the entire bar
  const remainingVisibleBeats = getVisibleBeats(section, bar)
  if (remainingVisibleBeats.length === 0) {
    // All beats deleted, remove the bar completely (skip confirmation since user already confirmed beat deletion)
    deleteBar(section, bar, true)
    return // deleteBar will close the menu, so we can return early
  }
  
  // Close menu
  openBarMenu.value = null
}

const scrollToSection = (index) => {
  currentSectionIndex.value = index
  const el = document.getElementById(`section-${index}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Scroll to section in preview mode
const scrollToPreviewSection = async (index) => {
  await nextTick()
  // Try multiple times in case DOM isn't ready
  let attempts = 0
  const tryScroll = () => {
    const el = document.getElementById(`preview-section-${index}`)
    if (el) {
      // Find the scroll container (preview-sections-container)
      const container = el.closest('.preview-sections-container')
      if (container) {
        // Calculate position relative to container
        const containerRect = container.getBoundingClientRect()
        const elementRect = el.getBoundingClientRect()
        const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 20 // 20px offset
        container.scrollTo({ top: scrollTop, behavior: 'smooth' })
      } else {
        // Fallback to window scroll
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      // Update active index immediately when clicking
      currentPreviewSectionIndex.value = index
    } else if (attempts < 5) {
      attempts++
      setTimeout(tryScroll, 100)
    } else {
      console.warn(`Could not find preview-section-${index}`)
    }
  }
  tryScroll()
}

// Scroll detection for active section
let observer = null
let previewObserver = null

onMounted(() => {
  // Set up observer if a song is already selected
  if (song.value) {
    setupObserver()
  }
  
  // Close bar menu when clicking outside
  document.addEventListener('click', closeBarMenu)
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
  if (isShowingPreview.value) {
    setupPreviewObserver()
  }
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
    if (previewObserver) {
      previewObserver.disconnect()
      previewObserver = null
    }
  }
})

// Watch for preview mode to set up preview observer
watch(() => showPreview, async (isPreview) => {
  if (isPreview) {
    await nextTick()
    setupPreviewObserver()
  } else {
    if (previewObserver) {
      previewObserver.disconnect()
      previewObserver = null
    }
  }
})

watch(() => isShowingPreview.value, async (showing) => {
  if (showing) {
    await nextTick()
    setupPreviewObserver()
  } else {
    if (previewObserver) {
      previewObserver.disconnect()
      previewObserver = null
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

// Helper function to set up the intersection observer for preview mode
const setupPreviewObserver = () => {
  if (!previewSong.value || !isShowingPreview.value) return

  if (previewObserver) {
    previewObserver.disconnect()
  }

  // Find the scroll container
  const container = document.querySelector('.preview-sections-container')
  
  const options = {
    root: container, // Use the scroll container as root
    threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0], // Multiple thresholds for better detection
    rootMargin: '-10% 0px -70% 0px' // Trigger when section is in upper portion of container
  }

  previewObserver = new IntersectionObserver((entries) => {
    // Find the entry with the highest intersection ratio (most visible)
    let mostVisible = null
    let highestRatio = 0
    
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
        highestRatio = entry.intersectionRatio
        mostVisible = entry
      }
    })
    
    if (mostVisible) {
      const index = parseInt(mostVisible.target.id.replace('preview-section-', ''))
      if (!isNaN(index)) {
        currentPreviewSectionIndex.value = index
      }
    }
  }, options)

  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    const sections = document.querySelectorAll('.preview-section-card')
    sections.forEach((section) => {
      if (section.id && section.id.startsWith('preview-section-')) {
        previewObserver.observe(section)
      }
    })
  }, 200)
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

// Router functions to update URL
const updateRoute = () => {
  if (isUpdatingFromRoute) return // Prevent circular updates
  
  const query = {}
  if (selectedSongId.value) {
    query.songId = selectedSongId.value
  }
  if (showPreview.value) {
    query.preview = 'true'
  }
  router.push({ 
    path: '/performance',
    query: Object.keys(query).length > 0 ? query : {}
  })
}

const goToSongList = () => {
  selectedSongId.value = null
  router.push({ path: '/performance' })
}

const openPreview = () => {
  if (selectedSongId.value) {
    router.push({ 
      path: '/performance',
      query: { songId: selectedSongId.value, preview: 'true' }
    })
  }
}

const closePreview = () => {
  if (selectedSongId.value) {
    router.push({ 
      path: '/performance',
      query: { songId: selectedSongId.value }
    })
  } else {
    router.push({ path: '/performance' })
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
    updateRoute()
    resetPlayback()
    // Mark as initialized after creation
    songInitialized.value = true
  } else {
    alert('Failed to create song: ' + (result.error || 'Unknown error'))
  }
}

const openSong = (songId) => {
  selectedSongId.value = songId
  resetPlayback()
  updateRoute()
}

const deleteSong = async (songId) => {
  if (!window.confirm('Are you sure you want to delete this song?')) {
    return
  }

  const result = await deleteSongFromFirestore(songId)

  if (result.success) {
    if (selectedSongId.value === songId) {
      selectedSongId.value = null
      router.push({ path: '/performance' })
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
  
  // Note: closeBarMenu listener is already added in the first onMounted hook
})

// Watch for when song is loaded from Firestore and mark as initialized
watch(() => song.value, (newSong, oldSong) => {
  if (newSong && newSong !== oldSong && selectedSongId.value) {
    // Ensure instruments array exists, initialize with defaults if missing
    if (!newSong.instruments || newSong.instruments.length === 0) {
      newSong.instruments = ['Drums', 'Bass', 'Guitar', 'Keys']
    }

    // Song loaded, mark as initialized after a brief delay
    setTimeout(() => {
      if (song.value && selectedSongId.value) {
        songInitialized.value = true
      }
    }, 200)
  } else if (!newSong) {
    songInitialized.value = false
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

.song-info {
  flex: 1;
  min-width: 0;
}

.header-top-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
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

.header-actions .instrument-list {
  margin-right: auto;
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.bar-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 4px;
}

.bar-menu-wrapper {
  position: absolute;
  right: -8px;
  top: 0;
}

.bar-menu-btn {
  background: transparent;
  border: 1px solid #cbd5e0;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: #718096;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  opacity: 0.6;
  line-height: 1;
}

.bar-menu-btn:hover {
  background: #f7fafc;
  border-color: #a0aec0;
  color: #4a5568;
  opacity: 1;
}

.bar-menu-dropdown {
  position: absolute;
  top: 20px;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 1000;
  overflow: visible;
}

.bar-menu-item {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.15s;
}

.bar-menu-item:hover {
  background: #f7fafc;
}

.bar-menu-item-danger {
  color: #e53e3e;
}

.bar-menu-item-danger:hover {
  background: #fed7d7;
  color: #c53030;
}

.bar-menu-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}

.menu-icon {
  font-size: 0.875rem;
  width: 16px;
  text-align: center;
}

.bar-menu-item-with-submenu {
  position: relative;
}

.bar-menu-item-with-submenu > .bar-menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submenu-arrow {
  font-size: 0.875rem;
  color: #a0aec0;
  margin-left: auto;
}

.bar-menu-submenu {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  z-index: 1002;
  overflow: hidden;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .bar-menu-submenu {
    left: auto;
    right: 100%;
    margin-left: 0;
    margin-right: 4px;
  }
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
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
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

/* Preview View (Full Screen) */
.preview-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  z-index: 9999;
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

.preview-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-share {
  padding: 8px 14px;
  border: 1px solid #667eea;
  background: rgba(102, 126, 234, 0.08);
  color: #667eea;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-share:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.15);
}

.btn-share:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

.preview-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-song-strip {
  position: sticky;
  top: 0;
  display: flex;
  min-height: 60px;
  width: 100%;
  background: #e0e0e0;
  overflow-x: auto;
  z-index: 5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 6px 15px 6px 0;
}

.preview-strip-segment {
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  font-size: 0.7rem;
  font-weight: 600;
  color: #666;
  background: #d1d5db;
  white-space: nowrap;
  overflow: hidden;
  min-width: 80px;
  cursor: pointer;
  transition: background-color 0.2s, border-left-color 0.2s;
}

.preview-strip-segment:hover {
  background: #9ca3af;
}

.preview-section-card-active {
  border-left: 4px solid #667eea;
  background: rgba(102, 126, 234, 0.06);
}

.preview-strip-section-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  margin-bottom: 2px;
}

.preview-strip-bars-container {
  display: flex;
  align-items: stretch;
  gap: 0;
  justify-content: stretch;
  flex: 1;
  min-height: 24px;
  padding: 0;
  width: 100%;
  position: relative;
}

.preview-strip-bar-segment {
  flex: 1;
  min-width: 0;
  border: none;
  transition: all 0.2s;
  background: #48bb78; /* Default to play (green) */
  display: block;
  cursor: pointer;
}

.preview-strip-phase-marker {
  width: 1px;
  background: #353535;
  flex-shrink: 0;
  height: 100%;
  z-index: 10;
  position: relative;
  /* box-shadow: 0 0 3px rgba(0, 0, 0, 0.5); */
  opacity: 0.8;
}

.bar-pattern-play {
  background: #48bb78;
  border-color: #38a169;
}

.bar-pattern-rest {
  background: #cbd5e0;
  border-color: #a0aec0;
}

.bar-pattern-fill {
  background: #ed8936;
  border-color: #dd6b20;
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
  overflow-x: hidden;
  padding: 12px;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-section-card {
  width: 100%;
  max-width: 860px;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-left: 4px solid transparent;
  transition: border-left-color 0.2s;
}

.preview-section-card-active {
  border-left: 4px solid #667eea;
  background: rgba(102, 126, 234, 0.06);
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
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.preview-bar-row-number {
  flex-shrink: 0;
  min-width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #9f9f9f;
  user-select: none;
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
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
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
@media (max-width: 768px) {
  .header-top {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 14px;
  }

  .song-info {
    width: 100%;
  }

  .header-top-row {
    margin-bottom: 10px;
    gap: 8px;
  }

  .btn-back {
    margin-right: 0;
    margin-bottom: 0;
    padding: 10px 12px;
    font-size: 0.875rem;
    font-weight: 600;
    min-height: 44px;
    border-radius: 8px;
  }

  .header-content-row {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .song-info-content {
    width: 100%;
    gap: 6px;
  }

  .song-title-input {
    font-size: 1.125rem;
    font-weight: 600;
    max-width: none;
    padding: 8px 10px;
    min-height: 44px;
    border-radius: 8px;
    margin: 0 0 4px 0;
  }

  .meta-info {
    gap: 8px;
    flex-wrap: wrap;
  }

  .bpm,
  .time-sig {
    padding: 6px 10px;
    min-height: 40px;
    font-size: 0.8125rem;
    gap: 4px;
    border-radius: 8px;
  }

  .header-top .label {
    font-size: 0.65rem;
    letter-spacing: 0.3px;
  }

  .meta-value-input {
    width: 48px;
    padding: 4px 6px;
    font-size: 0.875rem;
    min-height: 32px;
    border-radius: 6px;
  }

  .instrument-filter {
    width: 100%;
    gap: 6px;
  }

  .instrument-list {
    gap: 5px;
    row-gap: 6px;
  }

  .filter-btn {
    padding: 8px 12px;
    font-size: 0.8125rem;
    font-weight: 500;
    min-height: 40px;
    border-radius: 8px;
  }

  .instrument-tag {
    padding: 6px 10px;
    font-size: 0.8125rem;
    font-weight: 500;
    min-height: 40px;
    border-radius: 12px;
  }

  .instrument-remove {
    width: 20px;
    height: 20px;
    min-width: 20px;
    min-height: 20px;
    font-size: 1.1rem;
  }

  .instrument-manager {
    padding-top: 8px;
    gap: 6px;
  }

  .instrument-dropdown-wrapper {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .instrument-select {
    min-width: 100%;
    padding: 8px 10px;
    font-size: 0.875rem;
    min-height: 44px;
    border-radius: 8px;
    -webkit-appearance: none;
    appearance: none;
  }

  .instrument-input {
    max-width: none;
    padding: 8px 10px;
    font-size: 0.875rem;
    min-height: 44px;
    border-radius: 8px;
  }

  .sticky-header-container {
    padding: 0;
  }

  .header-actions {
    padding: 10px 16px;
    gap: 8px;
  }

  .header-actions .btn-save,
  .header-actions .btn-preview {
    min-height: 44px;
    padding: 10px 14px;
    font-size: 0.9rem;
  }

  .song-strip {
    height: 36px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .strip-segment {
    font-size: 0.7rem;
    padding: 0 8px;
    flex-shrink: 0;
    min-width: 48px;
  }

  /* Section card mobile */
  .sections-container {
    padding: 14px 16px;
  }

  .section-card {
    padding: 14px 16px;
    margin-bottom: 16px;
    border-radius: 10px;
  }

  .section-card.active {
    transform: none;
  }

  .section-header {
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 10px;
  }

  .section-title {
    flex: 1;
    min-width: 0;
    gap: 8px;
    flex-wrap: wrap;
  }

  .name-input {
    font-size: 1.0625rem;
    min-width: 0;
    padding: 6px 8px;
  }

  .bar-control {
    font-size: 0.8125rem;
    padding: 3px;
  }

  .bar-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    font-size: 0.9rem;
  }

  .bar-input {
    width: 36px;
  }

  .section-actions {
    gap: 8px;
  }

  .section-instructions {
    font-size: 0.8125rem;
    padding: 4px 10px;
  }

  .btn-remove {
    padding: 6px;
    font-size: 1.1rem;
    min-width: 40px;
    min-height: 40px;
  }

  .instruments-grid {
    gap: 10px;
  }

  .instrument-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .instrument-name {
    width: 64px;
    font-size: 0.8125rem;
  }

  .pattern-map {
    flex: 1;
    min-width: 0;
    gap: 8px;
  }

  .bar-row {
    gap: 6px;
  }

  .bar-container {
    gap: 3px;
  }

  .bar-header {
    margin-bottom: 2px;
  }

  .bar-label {
    font-size: 0.65rem;
    min-width: 18px;
  }

  .bar-menu-btn {
    width: 20px;
    height: 20px;
    min-width: 20px;
    min-height: 20px;
    font-size: 0.65rem;
  }

  .bar-menu-dropdown {
    min-width: 140px;
    font-size: 0.8125rem;
  }

  .bar-menu-item {
    padding: 8px 12px;
    font-size: 0.8125rem;
  }

  .bar-beats {
    gap: 1px;
    padding: 1px;
    border-radius: 4px;
  }

  .beat-block {
    width: 22px;
    height: 22px;
    font-size: 0.65rem;
    border-radius: 3px;
  }

  .btn-add {
    padding: 12px 14px;
    font-size: 0.9rem;
    border-radius: 10px;
  }

  /* Preview: vertical strip + sections in one row on mobile */
  .preview-body {
    flex-direction: row;
    min-width: 0;
  }

  .preview-song-strip {
    flex-direction: column;
    flex: 0 0 auto;
    width: 72px;
    min-width: 72px;
    max-width: 72px;
    min-height: 0;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 6px 16px 6px 4px;
    position: relative;
    top: 0;
  }

  .preview-strip-segment {
    flex: none;
    min-height: 52px;
    min-width: 0;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
    padding: 4px 0;
  }

  .preview-strip-segment:last-child {
    border-bottom: none;
  }

  .preview-strip-section-header {
    margin-bottom: 4px;
  }

  .preview-strip-name {
    font-size: 0.6rem;
    line-height: 1.2;
    text-align: center;
    display: block;
  }

  .preview-strip-bars {
    font-size: 0.55rem;
  }

  .preview-strip-bars-container {
    min-height: 20px;
    flex-direction: row;
  }

  .preview-strip-bars-container.preview-strip-bars-vertical {
    flex-direction: column;
    flex-wrap: nowrap;
    min-height: 0;
  }

  .preview-strip-bars-container.preview-strip-bars-vertical .preview-strip-bar-segment {
    flex: 1 1 auto;
    min-height: 4px;
  }

  .preview-strip-bars-container.preview-strip-bars-vertical .preview-strip-phase-marker {
    width: 100%;
    height: 1px;
  }

  .preview-sections-container {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 600px) {
  .header-top {
    padding: 8px 12px;
    gap: 8px;
  }

  .header-top-row {
    margin-bottom: 8px;
    gap: 8px;
  }

  .header-top-row .btn-share {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 0.8125rem;
  }

  .btn-back {
    padding: 8px 10px;
    font-size: 0.8125rem;
    min-height: 40px;
  }

  .header-content-row {
    gap: 8px;
  }

  .song-title-input {
    font-size: 1rem;
    padding: 8px 10px;
    min-height: 40px;
  }

  .bpm,
  .time-sig {
    padding: 5px 8px;
    min-height: 38px;
    font-size: 0.75rem;
  }

  .meta-value-input {
    width: 44px;
    font-size: 0.8125rem;
    min-height: 30px;
  }

  .filter-btn,
  .instrument-tag {
    padding: 6px 10px;
    font-size: 0.75rem;
    min-height: 38px;
  }

  .instrument-select,
  .instrument-input {
    padding: 8px 10px;
    font-size: 0.8125rem;
    min-height: 40px;
  }

  .header-actions {
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
    gap: 8px;
  }

  .header-actions .btn-save,
  .header-actions .btn-preview {
    flex: 1;
    min-height: 44px;
    padding: 10px 12px;
    font-size: 0.8125rem;
  }

  /* Section card – extra small screens */
  .sections-container {
    padding: 10px 12px;
  }

  .section-card {
    padding: 10px 12px;
    margin-bottom: 12px;
    border-radius: 8px;
    border-left-width: 4px;
  }

  .section-header {
    margin-bottom: 10px;
    padding-bottom: 8px;
    gap: 8px;
  }

  .section-title {
    gap: 6px;
  }

  .name-input {
    font-size: 1rem;
    padding: 6px 8px;
  }

  .bar-control {
    font-size: 0.75rem;
  }

  .bar-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
  }

  .bar-input {
    width: 32px;
  }

  .section-instructions {
    font-size: 0.75rem;
    padding: 4px 8px;
  }

  .instruments-grid {
    gap: 8px;
  }

  .instrument-name {
    width: 56px;
    font-size: 0.75rem;
  }

  .pattern-map {
    gap: 6px;
  }

  .bar-row {
    gap: 4px;
  }

  .bar-beats {
    gap: 1px;
    padding: 1px;
  }

  .beat-block {
    width: 20px;
    height: 20px;
    font-size: 0.6rem;
  }

  .bar-menu-btn {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
  }

  .btn-add {
    padding: 12px;
    font-size: 0.875rem;
    border-radius: 8px;
  }

  .preview-header {
    padding: 10px 12px;
  }

  .preview-title h2 {
    font-size: 1.1rem;
  }

  .preview-song-strip {
    width: 64px;
    min-width: 64px;
    max-width: 64px;
    padding: 6px 4px;
  }

  .preview-strip-segment {
    min-height: 48px;
  }

  .preview-strip-name {
    font-size: 0.55rem;
  }

  .preview-strip-bars {
    font-size: 0.5rem;
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
