<template>
  <div class="multi-track-editor">
    <div class="editor-header">
      <div class="header-controls">
        <button class="play-btn" @click="togglePlayPause" :disabled="tracks.length === 0 || blocks.length === 0">
          <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>
        <button class="stop-btn" @click="goToStart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="18 17 13 12 18 7"></polyline>
          </svg>
        </button>
        <button class="repeat-btn" :class="{ active: isRepeating }" @click="toggleRepeat" 
          :disabled="tracks.length === 0 || blocks.length === 0" title="Repeat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
        <div class="time-display">{{ formatTime(currentTime) }}</div>
      </div>
      <div class="header-actions">
        <div class="master-volume-control">
          <label class="master-volume-label">Master Volume</label>
          <input type="range" class="master-volume-slider" min="0" max="100" :value="masterVolume"
            @input="handleMasterVolumeChange" title="Master Volume" />
          <span class="master-volume-value">{{ masterVolume }}%</span>
        </div>
      </div>
    </div>

    <div class="file-library">
      <div class="library-header">
        <h3>Audio Library</h3>
        <button class="btn-upload-more" @click="triggerFileInput" title="Upload files">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Files
        </button>
      </div>
      <div class="library-grid" v-if="uploadedFiles.length > 0">
        <div 
          v-for="file in uploadedFiles" 
          :key="file.id" 
          class="library-item" 
          :class="{ 'library-item-dragging': touchDragState.isDragging && touchDragState.file?.id === file.id }"
          :style="{ backgroundColor: file.color }"
          draggable="true" 
          @dragstart="handleLibraryDragStart($event, file)"
          @touchstart="handleLibraryTouchStart($event, file)"
          @touchmove="handleLibraryTouchMove($event)"
          @touchend="handleLibraryTouchEnd($event)">
          <div class="library-item-icon">🎵</div>
          <div class="library-item-info">
            <div class="library-item-name">{{ getSummarizedName(file.file?.name || 'Unknown file') }}</div>
            <div class="library-item-duration">{{ formatTime(file.duration) }}</div>
          </div>
        </div>
      </div>
      <div v-else class="library-empty">
        <p>No files uploaded yet. Click "Add Files" to get started.</p>
      </div>
    </div>

    <!-- Hidden file input - always available for "Add Files" button -->
    <input ref="fileInput" type="file" accept="audio/*" multiple style="display: none" @change="handleFileSelect" />


    <div class="track-actions">
      <button class="btn-add-track" @click="addTrack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Track
      </button>
      <div class="zoom-controls">
        <button class="zoom-btn" @click="zoomOut" :disabled="zoomLevel <= 0.05" title="Zoom Out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <span class="zoom-level">{{ zoomLevel.toFixed(1) }}x</span>
        <button class="zoom-btn" @click="zoomIn" :disabled="zoomLevel >= 4" title="Zoom In">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button class="zoom-btn zoom-reset" @click="resetZoom" title="Reset Zoom">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="tracks-section">
      <div class="tracks-container" ref="tracksContainerRef" @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
        <!-- Time ruler -->
        <div class="time-ruler-wrapper">
          <div class="tracks-scroll-wrapper" ref="timeRulerScrollRef">
            <div class="time-ruler" :style="{ width: `${maxTrackWidth}px` }" @click="handleTimeRulerClick">
              <div 
                v-for="marker in timeMarkers" 
                :key="marker.time"
                class="time-marker"
                :style="{ left: `${marker.time * pixelsPerSecond}px` }"
              >
                <div class="time-tick"></div>
                <div class="time-label">{{ formatTime(marker.time) }}</div>
              </div>
            </div>
          </div>
        </div>
        <div 
          class="tracks-scroll-wrapper" 
          ref="tracksScrollWrapperRef"
        >
          <div class="tracks-wrapper" :style="{ width: `${maxTrackWidth}px` }">
            <!-- Single playhead line spanning all tracks -->
            <div 
              class="playhead-line" 
              :style="{ left: `${currentTime * pixelsPerSecond}px` }"
              v-if="tracks.length > 0"
              @mousedown="handlePlayheadDragStart"
              @touchstart="handlePlayheadDragStart"
            ></div>
            <Track v-for="(track, index) in tracks" :key="track.id" :trackIndex="index" :name="track.name"
              :blocks="getBlocksForTrack(track.id)" :pixelsPerSecond="pixelsPerSecond" :playingBlocks="playingBlocks"
              @drop-block="handleDropBlock" @update-name="handleTrackNameUpdate" @delete="handleTrackDelete"
              @block-drag-start="handleBlockDragStart" @block-drag-move="handleBlockDragMove"
              @block-drag-end="handleBlockDragEnd" @block-delete="handleBlockDelete" @volume-change="handleVolumeChange"
              @mute-toggle="handleMuteToggle" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { formatTime } from '../utils/timeFormat'
import { useMultiTrack } from '../composables/useMultiTrack'
import Track from './Track.vue'

const fileInput = ref(null)
const tracksContainerRef = ref(null)
const tracksScrollWrapperRef = ref(null)
const timeRulerScrollRef = ref(null)
const isDragging = ref(false)

// Touch drag state for mobile
const touchDragState = ref({
  isDragging: false,
  file: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  activeTrackIndex: null
})

// Track if a block is being dragged (to prevent scrolling)
const isBlockDragging = ref(false)

// Track block drag state for cross-track dragging on mobile
const blockDragState = ref({
  isDragging: false,
  blockId: null,
  sourceTrackIndex: null,
  currentTrackIndex: null,
  currentX: 0,
  currentY: 0
})

// Track touch start position to detect scrollbar touches
const touchStartPosition = ref({ x: 0, y: 0, isOnScrollbar: false })

// Store global touch handlers for cleanup
let globalTouchMoveHandler = null
let globalTouchEndHandler = null
let scrollWrapperTouchMoveHandler = null
let scrollWrapperTouchStartHandler = null
const basePixelsPerSecond = 50
const zoomLevel = ref(1.0)
const pixelsPerSecond = computed(() => basePixelsPerSecond * zoomLevel.value)
const isDraggingPlayhead = ref(false)
const playheadDragStartTime = ref(0)

// Track and block management
const tracks = ref([])
const blocks = ref([]) // { blockId, fileId, trackId, startTime, file, duration, color }
const uploadedFiles = ref([]) // { id, file, duration }

// Playback state
const isPlaying = ref(false)
const currentTime = ref(0)
const playbackStartTime = ref(0)
const animationFrameId = ref(null)
const playingBlocks = ref(new Set())
const isRepeating = ref(false)

// Multi-track audio
const {
  loadAudioFile,
  playBlock,
  stopBlock,
  stopAll,
  setVolume,
  setMasterVolume,
  cleanup
} = useMultiTrack()

// Master volume
const masterVolume = ref(100)

// Generate unique IDs
let trackIdCounter = 0
let fileIdCounter = 0
let blockIdCounter = 0

const generateTrackId = () => `track-${trackIdCounter++}`
const generateFileId = () => `file-${fileIdCounter++}`
const generateBlockId = () => `block-${blockIdCounter++}`

// Generate random color for library items
const generateRandomColor = () => {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea',
    '#fed6e3', '#ffecd2', '#fcb69f', '#ff9a9e', '#a8caba',
    '#fbc2eb', '#5d4e75', '#8e9aaf', '#cbc0d3', '#d4a5a5'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Summarize file name (remove extension, truncate if too long)
const getSummarizedName = (fileName) => {
  if (!fileName) return 'Unknown file'
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
  // Truncate if longer than 25 characters
  if (nameWithoutExt.length > 25) {
    return nameWithoutExt.substring(0, 22) + '...'
  }
  return nameWithoutExt
}

// Sync time ruler scroll with tracks scroll
onMounted(() => {
  if (tracks.value.length === 0) {
    addTrack()
    addTrack()
    addTrack()
  }
  // Initialize master volume
  setMasterVolume(masterVolume.value / 100)
  
  // Sync scroll between time ruler and tracks
  const syncRulerToTracks = () => {
    if (timeRulerScrollRef.value && tracksScrollWrapperRef.value) {
      timeRulerScrollRef.value.scrollLeft = tracksScrollWrapperRef.value.scrollLeft
    }
  }
  
  const syncTracksToRuler = () => {
    if (tracksScrollWrapperRef.value && timeRulerScrollRef.value) {
      tracksScrollWrapperRef.value.scrollLeft = timeRulerScrollRef.value.scrollLeft
    }
  }
  
  // Listen to tracks scroll and sync to ruler
  if (tracksScrollWrapperRef.value) {
    tracksScrollWrapperRef.value.addEventListener('scroll', syncRulerToTracks)
  }
  
  // Listen to ruler scroll and sync to tracks
  if (timeRulerScrollRef.value) {
    timeRulerScrollRef.value.addEventListener('scroll', syncTracksToRuler)
  }
  
  // Track touch start to detect if it's on the scrollbar
  scrollWrapperTouchStartHandler = (event) => {
    const touch = event.touches[0]
    if (!touch || !tracksScrollWrapperRef.value) return
    
    const rect = tracksScrollWrapperRef.value.getBoundingClientRect()
    const scrollbarHeight = 12 // Height of scrollbar from CSS
    const touchY = touch.clientY - rect.top
    const containerHeight = rect.height
    
    // Check if touch is in the scrollbar area (bottom of container)
    // Add some tolerance for easier targeting
    const scrollbarAreaHeight = Math.max(scrollbarHeight, 20) // At least 20px for easier touch
    const isOnScrollbar = touchY >= (containerHeight - scrollbarAreaHeight)
    
    touchStartPosition.value = {
      x: touch.clientX,
      y: touch.clientY,
      isOnScrollbar: isOnScrollbar
    }
  }
  
  // Prevent scrolling when dragging blocks, but allow scrolling when touching scrollbar
  scrollWrapperTouchMoveHandler = (event) => {
    // If a block is being dragged, always prevent scrolling
    if (isBlockDragging.value) {
      event.preventDefault()
      return
    }
    
    // Only allow scrolling if touch started on the scrollbar
    if (!touchStartPosition.value.isOnScrollbar) {
      // Prevent scrolling for non-scrollbar areas
      event.preventDefault()
    }
    // If touch started on scrollbar, don't prevent default - allow native scrolling
  }
  
  if (tracksScrollWrapperRef.value) {
    tracksScrollWrapperRef.value.addEventListener('touchstart', scrollWrapperTouchStartHandler, { passive: true })
    tracksScrollWrapperRef.value.addEventListener('touchmove', scrollWrapperTouchMoveHandler, { passive: false })
  }
  
  // Global touch move handler for mobile drag
  const handleGlobalTouchMove = (event) => {
    if (touchDragState.value.file) {
      handleLibraryTouchMove(event)
    }
  }
  
  // Global touch end handler for mobile drag
  const handleGlobalTouchEnd = (event) => {
    if (touchDragState.value.file) {
      handleLibraryTouchEnd(event)
    }
  }
  
  // Store handlers for cleanup
  globalTouchMoveHandler = handleGlobalTouchMove
  globalTouchEndHandler = handleGlobalTouchEnd
  
  document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
  document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false })
  document.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: false })
  
  // Return cleanup function
  return () => {
    document.removeEventListener('touchmove', handleGlobalTouchMove)
    document.removeEventListener('touchend', handleGlobalTouchEnd)
    document.removeEventListener('touchcancel', handleGlobalTouchEnd)
  }
})

onUnmounted(() => {
  // Clean up global touch handlers
  if (globalTouchMoveHandler) {
    document.removeEventListener('touchmove', globalTouchMoveHandler)
  }
  if (globalTouchEndHandler) {
    document.removeEventListener('touchend', globalTouchEndHandler)
    document.removeEventListener('touchcancel', globalTouchEndHandler)
  }
  // Clean up scroll wrapper touch handlers
  if (tracksScrollWrapperRef.value) {
    if (scrollWrapperTouchStartHandler) {
      tracksScrollWrapperRef.value.removeEventListener('touchstart', scrollWrapperTouchStartHandler)
    }
    if (scrollWrapperTouchMoveHandler) {
      tracksScrollWrapperRef.value.removeEventListener('touchmove', scrollWrapperTouchMoveHandler)
    }
  }
  // Restore scrolling if still dragging
  if (touchDragState.value.isDragging) {
    document.body.style.overflow = ''
  }
})

// Get blocks for a specific track
const getBlocksForTrack = (trackId) => {
  return blocks.value.filter(block => block.trackId === trackId)
}

// Calculate time markers for the ruler
const timeMarkers = computed(() => {
  const markers = []
  const maxTime = maxTrackWidth.value / pixelsPerSecond.value
  const interval = Math.max(1, Math.floor(maxTime / 20)) // Show about 20 markers, minimum 1 second intervals
  
  for (let time = 0; time <= maxTime; time += interval) {
    markers.push({ time: Math.round(time * 10) / 10 }) // Round to 1 decimal
  }
  return markers
})

// Handle time ruler click to seek
const handleTimeRulerClick = (event) => {
  event.stopPropagation()
  const ruler = event.currentTarget
  const rect = ruler.getBoundingClientRect()
  const scrollWrapper = timeRulerScrollRef.value || tracksScrollWrapperRef.value
  if (!scrollWrapper) return
  
  const scrollLeft = scrollWrapper.scrollLeft
  const x = (event.clientX - rect.left) + scrollLeft
  const newTime = Math.max(0, x / pixelsPerSecond.value)
  
  // Pause if playing
  if (isPlaying.value) {
    pause()
  }
  
  currentTime.value = newTime
  playbackStartTime.value = newTime
}

// Calculate maximum track width based on all blocks
const maxTrackWidth = computed(() => {
  if (blocks.value.length === 0) {
    return Math.max(1000, pixelsPerSecond.value * 10) // Default minimum width
  }
  const maxEndTime = Math.max(...blocks.value.map(block => block.startTime + block.duration))
  return Math.max(maxEndTime * pixelsPerSecond.value + 200, 1000) // Add padding and minimum width
})

// File upload handlers
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files).filter(file =>
    file.type.startsWith('audio/')
  )
  if (files.length === 0) {
    alert('Please select valid audio files.')
    event.target.value = '' // Reset input
    return
  }
  await processFiles(files)
  event.target.value = '' // Reset input
}

const handleDrop = async (event) => {
  isDragging.value = false
  const files = Array.from(event.dataTransfer.files).filter(file =>
    file.type.startsWith('audio/')
  )
  await processFiles(files)
}

const processFiles = async (files) => {
  if (files.length === 0) return

  // Filter for audio files only
  const audioFiles = files.filter(file => file.type.startsWith('audio/'))
  if (audioFiles.length === 0) {
    alert('No valid audio files found. Please select audio files (MP3, WAV, OGG, M4A, etc.)')
    return
  }

  // Process files in parallel for better performance
  const filePromises = audioFiles.map(async (file) => {
    try {
      const audio = new Audio(URL.createObjectURL(file))
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout loading audio metadata'))
        }, 10000) // 10 second timeout

        audio.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout)
          const fileId = generateFileId()
          uploadedFiles.value.push({
            id: fileId,
            file,
            duration: audio.duration || 0,
            color: generateRandomColor()
          })

          // Load into audio buffer
          loadAudioFile(file, fileId).catch(err => {
            console.error(`Error loading audio buffer for ${file.name}:`, err)
          })

          audio.removeEventListener('loadedmetadata', resolve)
          audio.removeEventListener('error', reject)
          resolve()
        })
        audio.addEventListener('error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })
      })
    } catch (error) {
      console.error('Error processing file:', file.name, error)
      alert(`Error loading ${file.name}: ${error.message || 'Unknown error'}`)
    }
  })

  await Promise.allSettled(filePromises)
}

// Track management
const addTrack = () => {
  tracks.value.push({
    id: generateTrackId(),
    name: `Track ${tracks.value.length + 1}`,
    volume: 1,
    isMuted: false
  })
}

const handleTrackNameUpdate = ({ trackIndex, name }) => {
  if (tracks.value[trackIndex]) {
    tracks.value[trackIndex].name = name
  }
}

const handleTrackDelete = (trackIndex) => {
  // Remove all blocks from this track
  const track = tracks.value[trackIndex]
  if (track) {
    blocks.value = blocks.value.filter(block => block.trackId !== track.id)
    tracks.value.splice(trackIndex, 1)
  }
}

// Block management
const handleLibraryDragStart = (event, file) => {
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/json', JSON.stringify({
    fileId: file.id,
    file: file.file,
    duration: file.duration,
    color: file.color
  }))
}

// Touch handlers for mobile drag and drop
const handleLibraryTouchStart = (event, file) => {
  const touch = event.touches[0]
  touchDragState.value = {
    isDragging: false, // Start as false, will be set to true after threshold
    file: file,
    startX: touch.clientX,
    startY: touch.clientY,
    currentX: touch.clientX,
    currentY: touch.clientY,
    activeTrackIndex: null
  }
}

const handleLibraryTouchMove = (event) => {
  if (!touchDragState.value.file) return
  
  const touch = event.touches[0]
  const deltaX = Math.abs(touch.clientX - touchDragState.value.startX)
  const deltaY = Math.abs(touch.clientY - touchDragState.value.startY)
  const threshold = 10 // pixels
  
  // Only start dragging if moved beyond threshold
  if (!touchDragState.value.isDragging && (deltaX > threshold || deltaY > threshold)) {
    touchDragState.value.isDragging = true
    // Prevent scrolling while dragging
    document.body.style.overflow = 'hidden'
    event.preventDefault()
  }
  
  if (!touchDragState.value.isDragging) return
  
  event.preventDefault()
  touchDragState.value.currentX = touch.clientX
  touchDragState.value.currentY = touch.clientY
  
  // Find which track (if any) is under the touch point
  const trackElements = document.querySelectorAll('.track')
  let activeTrackIndex = null
  
  trackElements.forEach((trackEl, index) => {
    const rect = trackEl.getBoundingClientRect()
    if (
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    ) {
      activeTrackIndex = index
    }
  })
  
  touchDragState.value.activeTrackIndex = activeTrackIndex
  
  // Update visual feedback on tracks
  trackElements.forEach((trackEl, index) => {
    if (index === activeTrackIndex) {
      trackEl.classList.add('track-active')
    } else {
      trackEl.classList.remove('track-active')
    }
  })
}

const handleLibraryTouchEnd = (event) => {
  if (!touchDragState.value.file) {
    // Reset state if drag never started
    touchDragState.value = {
      isDragging: false,
      file: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      activeTrackIndex: null
    }
    return
  }
  
  if (!touchDragState.value.isDragging) {
    // If drag never started (below threshold), reset and return
    touchDragState.value = {
      isDragging: false,
      file: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      activeTrackIndex: null
    }
    return
  }
  
  event.preventDefault()
  const { file, activeTrackIndex, currentX, currentY } = touchDragState.value
  
  // Restore scrolling
  document.body.style.overflow = ''
  
  // If dropped on a track, handle the drop
  if (activeTrackIndex !== null && file) {
    const trackElements = document.querySelectorAll('.track')
    const trackEl = trackElements[activeTrackIndex]
    if (trackEl) {
      const trackContent = trackEl.querySelector('.track-content')
      if (trackContent) {
        const rect = trackContent.getBoundingClientRect()
        const scrollWrapper = tracksScrollWrapperRef.value
        const scrollLeft = scrollWrapper ? scrollWrapper.scrollLeft : 0
        const x = (currentX - rect.left) + scrollLeft
        const dropTime = Math.max(0, x / pixelsPerSecond.value)
        
        handleDropBlock({
          fileId: file.id,
          file: file.file,
          duration: file.duration,
          trackIndex: activeTrackIndex,
          dropTime,
          color: file.color
        })
      }
    }
  }
  
  // Clean up visual feedback
  document.querySelectorAll('.track').forEach(trackEl => {
    trackEl.classList.remove('track-active')
  })
  
  // Reset touch drag state
  touchDragState.value = {
    isDragging: false,
    file: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    activeTrackIndex: null
  }
}

const handleDropBlock = ({ blockId, fileId, file, duration, trackIndex, dropTime = 0, sourceTrackIndex = null, color = null }) => {
  const track = tracks.value[trackIndex]
  if (!track) return

  // Check if this is a block being moved (either within same track or to another track)
  if (blockId) {
    const existingBlock = blocks.value.find(b => b.blockId === blockId)
    if (existingBlock) {
      // Block is being moved - check if it's moving to a different track
      if (sourceTrackIndex !== null && sourceTrackIndex !== trackIndex) {
        // Moving to a different track - remove from old track and add to new track
        blocks.value = blocks.value.filter(b => b.blockId !== blockId)
        
        // Add to new track with non-overlapping position
        const startTime = findNonOverlappingPosition(track.id, dropTime, duration)
        blocks.value.push({
          blockId: generateBlockId(), // New unique ID for this block instance
          fileId: existingBlock.fileId,
          trackId: track.id,
          startTime,
          file: existingBlock.file,
          duration: existingBlock.duration,
          color: existingBlock.color // Preserve color when moving between tracks
        })
      } else if (sourceTrackIndex === trackIndex || existingBlock.trackId === track.id) {
        // Moving within the same track - just update position
        const newStartTime = findNonOverlappingPosition(track.id, dropTime, existingBlock.duration, blockId)
        existingBlock.startTime = Math.max(0, newStartTime)
      }
      return
    }
  }

  // This is a new block from the library (not moving an existing block)
  // Find the uploaded file
  const uploadedFile = uploadedFiles.value.find(f => f.id === fileId)
  if (!uploadedFile) return

  // Find a non-overlapping position for the new block
  const startTime = findNonOverlappingPosition(track.id, dropTime, uploadedFile.duration)

  // Use color from drag data if provided, otherwise use color from uploaded file
  // Check for both null and undefined
  const blockColor = (color !== null && color !== undefined) ? color : uploadedFile.color

  blocks.value.push({
    blockId: generateBlockId(), // Unique ID for each block instance
    fileId,
    trackId: track.id,
    startTime,
    file: uploadedFile.file,
    duration: uploadedFile.duration,
    color: blockColor
  })
}

// Helper function to find a non-overlapping position
const findNonOverlappingPosition = (trackId, preferredTime, blockDuration, excludeBlockId = null) => {
  // Get all blocks on this track (excluding the one being moved if applicable)
  const trackBlocks = blocks.value.filter(
    b => b.trackId === trackId && (excludeBlockId === null || b.blockId !== excludeBlockId)
  )

  if (trackBlocks.length === 0) {
    return Math.max(0, preferredTime)
  }

  // Sort blocks by start time
  const sortedBlocks = [...trackBlocks].sort((a, b) => a.startTime - b.startTime)

  const blockEndTime = preferredTime + blockDuration

  // Check if preferred position overlaps with any block
  const overlappingBlock = sortedBlocks.find(block => {
    const blockStart = block.startTime
    const blockEnd = block.startTime + block.duration
    return (preferredTime < blockEnd && blockEndTime > blockStart)
  })

  if (!overlappingBlock) {
    // No overlap, use preferred position
    return Math.max(0, preferredTime)
  }

  // Find the best position: either before or after the overlapping block
  const overlapStart = overlappingBlock.startTime
  const overlapEnd = overlappingBlock.startTime + overlappingBlock.duration

  // Check if we can place it before (to the left)
  const beforePosition = overlapStart - blockDuration
  if (beforePosition >= 0) {
    // Check if this position doesn't overlap with previous blocks
    const wouldOverlapBefore = sortedBlocks.some(block => {
      if (block.startTime >= overlapStart) return false
      const blockEnd = block.startTime + block.duration
      return (beforePosition < blockEnd && beforePosition + blockDuration > block.startTime)
    })

    if (!wouldOverlapBefore) {
      return beforePosition
    }
  }

  // Place it after (to the right) of the overlapping block
  const afterPosition = overlapEnd

  // Check if this position doesn't overlap with subsequent blocks
  let finalPosition = afterPosition
  for (const block of sortedBlocks) {
    if (block.startTime < afterPosition) continue

    const blockStart = block.startTime
    const blockEnd = block.startTime + block.duration

    if (afterPosition < blockEnd && afterPosition + blockDuration > blockStart) {
      // Would overlap, move to after this block
      finalPosition = blockEnd
    } else {
      break
    }
  }

  return finalPosition
}

const handleBlockDragStart = ({ blockId, trackIndex }) => {
  // Block drag started - prevent scrolling
  isBlockDragging.value = true
  
  // Track block drag state for cross-track dragging
  const block = blocks.value.find(b => b.blockId === blockId)
  if (block) {
    blockDragState.value = {
      isDragging: true,
      blockId: blockId,
      sourceTrackIndex: trackIndex,
      currentTrackIndex: trackIndex,
      currentX: 0,
      currentY: 0
    }
  }
}

const handleBlockDragMove = ({ blockId, newStartTime, currentX, currentY }) => {
  const block = blocks.value.find(b => b.blockId === blockId)
  if (!block) return
  
  // Update drag state with current position
  if (blockDragState.value.isDragging && blockDragState.value.blockId === blockId) {
    // Update current position
    if (currentX !== undefined) blockDragState.value.currentX = currentX
    if (currentY !== undefined) blockDragState.value.currentY = currentY
    
    // Find which track the touch is currently over
    const trackElements = document.querySelectorAll('.track')
    let currentTrackIndex = blockDragState.value.sourceTrackIndex
    
    if (currentX !== undefined && currentY !== undefined) {
      trackElements.forEach((trackEl, index) => {
        const rect = trackEl.getBoundingClientRect()
        if (
          currentX >= rect.left &&
          currentX <= rect.right &&
          currentY >= rect.top &&
          currentY <= rect.bottom
        ) {
          currentTrackIndex = index
        }
      })
    }
    
    blockDragState.value.currentTrackIndex = currentTrackIndex
    
    // Update visual feedback on tracks
    trackElements.forEach((trackEl, index) => {
      if (index === currentTrackIndex && index !== blockDragState.value.sourceTrackIndex) {
        trackEl.classList.add('track-active')
      } else {
        trackEl.classList.remove('track-active')
      }
    })
  }
  
  // Only update position if dragging within the same track
  if (block.trackId === tracks.value[blockDragState.value.sourceTrackIndex]?.id) {
    // Find non-overlapping position for the dragged block
    const validStartTime = findNonOverlappingPosition(
      block.trackId,
      newStartTime,
      block.duration,
      blockId // Exclude the block being dragged
    )
    block.startTime = Math.max(0, validStartTime)
  }
}

const handleBlockDragEnd = ({ blockId }) => {
  // Block drag ended
  isBlockDragging.value = false
  
  // Handle cross-track drop if needed
  if (blockDragState.value.isDragging && blockDragState.value.blockId === blockId) {
    const { sourceTrackIndex, currentTrackIndex, currentX, currentY } = blockDragState.value
    
    // If dropped on a different track, handle the drop
    if (currentTrackIndex !== null && currentTrackIndex !== sourceTrackIndex && currentX > 0 && currentY > 0) {
      const block = blocks.value.find(b => b.blockId === blockId)
      if (block) {
        const trackElements = document.querySelectorAll('.track')
        const targetTrackEl = trackElements[currentTrackIndex]
        if (targetTrackEl) {
          const trackContent = targetTrackEl.querySelector('.track-content')
          if (trackContent) {
            const rect = trackContent.getBoundingClientRect()
            const scrollWrapper = tracksScrollWrapperRef.value
            const scrollLeft = scrollWrapper ? scrollWrapper.scrollLeft : 0
            const x = (currentX - rect.left) + scrollLeft
            const dropTime = Math.max(0, x / pixelsPerSecond.value)
            
            handleDropBlock({
              blockId: block.blockId,
              fileId: block.fileId,
              duration: block.duration,
              trackIndex: currentTrackIndex,
              dropTime,
              sourceTrackIndex: sourceTrackIndex,
              color: block.color
            })
          }
        }
      }
    }
    
    // Clean up visual feedback
    document.querySelectorAll('.track').forEach(trackEl => {
      trackEl.classList.remove('track-active')
    })
  }
  
  // Reset block drag state
  blockDragState.value = {
    isDragging: false,
    blockId: null,
    sourceTrackIndex: null,
    currentTrackIndex: null,
    currentX: 0,
    currentY: 0
  }
}

const handleBlockDelete = ({ trackIndex, blockId }) => {
  const track = tracks.value[trackIndex]
  if (track) {
    const block = blocks.value.find(b => b.blockId === blockId && b.trackId === track.id)
    if (block) {
      blocks.value = blocks.value.filter(b => b.blockId !== blockId)
      stopBlock(block.blockId) // Use blockId for audio playback
    }
  }
}


// Volume and mute
const handleVolumeChange = ({ trackIndex, volume }) => {
  const track = tracks.value[trackIndex]
  if (track) {
    track.volume = volume // Store as 0-1 range
    // Update volume for all blocks in this track - setVolume uses trackId
    setVolume(track.id, track.isMuted ? 0 : volume)
  }
}

const handleMuteToggle = ({ trackIndex, isMuted }) => {
  const track = tracks.value[trackIndex]
  if (track) {
    track.isMuted = isMuted
    // Update volume for all blocks in this track - use track.volume which is already in 0-1 range
    const volumeToSet = isMuted ? 0 : (track.volume || 1)
    setVolume(track.id, volumeToSet)
  }
}

// Master volume control
const handleMasterVolumeChange = (event) => {
  masterVolume.value = Number(event.target.value)
  setMasterVolume(masterVolume.value / 100)
}

// Playback
const togglePlayPause = async () => {
  if (isPlaying.value) {
    pause()
  } else {
    await play()
  }
}

const play = async () => {
  if (blocks.value.length === 0) return

  isPlaying.value = true
  const startTimestamp = Date.now()
  playbackStartTime.value = currentTime.value

  // Play all blocks that should be playing at current time
  for (const block of blocks.value) {
    const track = tracks.value.find(t => t.id === block.trackId)
    if (track && !track.isMuted) {
      // Only play blocks that haven't started yet or are currently playing
      const blockStartTime = block.startTime
      const blockEndTime = block.startTime + block.duration

      if (currentTime.value < blockEndTime) {
        try {
          const offset = Math.max(0, currentTime.value - blockStartTime)
          const delay = Math.max(0, blockStartTime - currentTime.value)
          await playBlock(block.blockId, block.fileId, block.trackId, delay, offset)
          playingBlocks.value.add(block.blockId)
        } catch (error) {
          console.error('Error playing block:', error)
        }
      }
    }
  }

  // Update current time
  const updateTime = () => {
    if (isPlaying.value) {
      const elapsed = (Date.now() - startTimestamp) / 1000
      currentTime.value = playbackStartTime.value + elapsed

      // Check if all blocks have finished
      const maxEndTime = blocks.value.length > 0
        ? Math.max(...blocks.value.map(b => b.startTime + b.duration))
        : 0

      if (currentTime.value >= maxEndTime) {
        if (isRepeating.value) {
          // Restart from beginning
          pause()
          currentTime.value = 0
          playbackStartTime.value = 0
          // Restart playback after a brief delay
          setTimeout(() => {
            if (isRepeating.value) {
              play()
            }
          }, 50)
        } else {
          stop()
        }
      } else {
        animationFrameId.value = requestAnimationFrame(updateTime)
      }
    }
  }
  updateTime()
}

const pause = () => {
  isPlaying.value = false
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
  // Note: Web Audio API doesn't support pause, so we stop and will resume from currentTime
  playingBlocks.value.forEach(blockId => {
    stopBlock(blockId)
  })
  playingBlocks.value.clear()
}

const stop = () => {
  pause()
  currentTime.value = 0
  playbackStartTime.value = 0
  stopAll()
}

const goToStart = () => {
  pause()
  currentTime.value = 0
  playbackStartTime.value = 0
  stopAll()
}

const toggleRepeat = () => {
  isRepeating.value = !isRepeating.value
}

// Zoom functionality
const zoomIn = () => {
  if (zoomLevel.value < 4) {
    // Use smaller steps when zoomed out, larger steps when zoomed in
    const step = zoomLevel.value < 1 ? 0.1 : 0.25
    zoomLevel.value = Math.min(4, zoomLevel.value + step)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.05) {
    // Use smaller steps when zoomed out, larger steps when zoomed in
    const step = zoomLevel.value <= 1 ? 0.1 : 0.25
    zoomLevel.value = Math.max(0.05, zoomLevel.value - step)
  }
}

const resetZoom = () => {
  zoomLevel.value = 1.0
}

// Playhead dragging
const handlePlayheadDragStart = (event) => {
  event.preventDefault()
  event.stopPropagation()
  
  isDraggingPlayhead.value = true
  playheadDragStartTime.value = currentTime.value
  
  // Pause playback if playing
  if (isPlaying.value) {
    pause()
  }
  
  const handleMove = (e) => {
    if (!isDraggingPlayhead.value) return
    e.preventDefault()
    e.stopPropagation()
    
    // Get the scroll wrapper for coordinate calculation
    const scrollWrapper = tracksScrollWrapperRef.value
    if (!scrollWrapper) return
    
    const rect = scrollWrapper.getBoundingClientRect()
    const scrollLeft = scrollWrapper.scrollLeft
    const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX
    const x = (clientX - rect.left) + scrollLeft
    const newTime = Math.max(0, x / pixelsPerSecond.value)
    
    currentTime.value = newTime
    playbackStartTime.value = newTime
  }
  
  const handleEnd = () => {
    isDraggingPlayhead.value = false
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
  }
  
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMove, { passive: false })
  document.addEventListener('touchend', handleEnd)
}

// Cleanup
onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  cleanup()
})

// Watch for file duration updates
watch(uploadedFiles, (newFiles) => {
  newFiles.forEach(async (fileData) => {
    if (!fileData.duration) {
      try {
        const audio = new Audio(URL.createObjectURL(fileData.file))
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            fileData.duration = audio.duration
            resolve()
          })
        })
      } catch (error) {
        console.error('Error getting duration:', error)
      }
    }
  })
})
</script>

<style scoped>
.multi-track-editor {
  display: flex;
  flex-direction: column;
  min-height: 600px;
  background: #f8f9ff;
  width: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-bottom: 2px solid #e0e0e0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.play-btn,
.stop-btn,
.repeat-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
}

.play-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-btn {
  background: linear-gradient(135deg, #667eea 0%, #5568d3 100%);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
}

.stop-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
}

.repeat-btn.active {
  background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
  box-shadow: 0 3px 10px rgba(81, 207, 102, 0.4);
}

.repeat-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
}

.repeat-btn.active:hover:not(:disabled) {
  box-shadow: 0 5px 15px rgba(81, 207, 102, 0.6);
}

.repeat-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn svg,
.stop-btn svg,
.repeat-btn svg {
  width: 24px;
  height: 24px;
}

.time-display {
  font-size: 1.2em;
  font-weight: 600;
  color: #333;
  min-width: 80px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f2ff;
  border-radius: 8px;
}

.zoom-btn {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #667eea;
  transition: all 0.2s ease;
  padding: 0;
}

.zoom-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.zoom-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-btn svg {
  width: 16px;
  height: 16px;
}

.zoom-level {
  font-size: 0.9em;
  font-weight: 600;
  color: #333;
  min-width: 40px;
  text-align: center;
}

.zoom-reset {
  margin-left: 4px;
}

.master-volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f0f2ff;
  border-radius: 8px;
}

.master-volume-label {
  font-size: 0.9em;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.master-volume-slider {
  width: 120px;
  height: 6px;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background: #ddd;
  border-radius: 3px;
  outline: none;
}

.master-volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.2s ease;
}

.master-volume-slider::-webkit-slider-thumb:hover {
  background: #5568d3;
  transform: scale(1.1);
}

.master-volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.master-volume-slider::-moz-range-thumb:hover {
  background: #5568d3;
  transform: scale(1.1);
}

.master-volume-value {
  font-size: 0.85em;
  font-weight: 600;
  color: #667eea;
  min-width: 45px;
  text-align: right;
}

/* Mobile responsive styles for editor-header */
@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 15px;
    padding: 15px;
  }

  .header-controls {
    width: 100%;
    justify-content: center;
    gap: 12px;
  }

  .play-btn,
  .stop-btn {
    width: 56px;
    height: 56px;
    min-width: 56px;
    min-height: 56px;
  }

  .play-btn svg,
  .stop-btn svg {
    width: 28px;
    height: 28px;
  }

  .time-display {
    font-size: 1.1em;
    min-width: 70px;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .master-volume-control {
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 280px;
    padding: 12px;
  }

  .master-volume-label {
    font-size: 0.85em;
    width: 100%;
    text-align: center;
  }

  .master-volume-slider {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
  }

  .master-volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  .master-volume-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }

  .master-volume-value {
    font-size: 0.9em;
    width: 100%;
    text-align: center;
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .editor-header {
    padding: 12px;
    gap: 12px;
  }

  .header-controls {
    gap: 10px;
  }

  .play-btn,
  .stop-btn,
  .repeat-btn {
    width: 52px;
    height: 52px;
    min-width: 52px;
    min-height: 52px;
  }

  .play-btn svg,
  .stop-btn svg,
  .repeat-btn svg {
    width: 26px;
    height: 26px;
  }

  .time-display {
    font-size: 1em;
    min-width: 60px;
  }

  .master-volume-control {
    padding: 10px;
    max-width: 100%;
  }

  .master-volume-label {
    font-size: 0.8em;
  }

  .master-volume-slider {
    height: 10px;
  }

  .master-volume-slider::-webkit-slider-thumb {
    width: 22px;
    height: 22px;
  }

  .master-volume-slider::-moz-range-thumb {
    width: 22px;
    height: 22px;
  }

  .master-volume-value {
    font-size: 0.85em;
  }
}

.btn-add-track {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: auto;
}

.btn-add-track:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-add-track svg {
  width: 18px;
  height: 18px;
}

.file-library {
  padding: 20px;
  background: white;
  border-bottom: 2px solid #e0e0e0;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.file-library h3 {
  margin: 0;
  color: #333;
  font-size: 1.1em;
}

.btn-upload-more {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-upload-more:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-upload-more svg {
  width: 16px;
  height: 16px;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.library-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f0f2ff;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s ease;
}

.library-item:hover {
  border-color: rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  filter: brightness(1.05);
}

.library-item:active {
  cursor: grabbing;
}

.library-item-dragging {
  opacity: 0.6;
  transform: scale(0.95);
  cursor: grabbing !important;
  z-index: 1000;
  position: relative;
}

.library-item-icon {
  font-size: 2em;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.library-item-info {
  flex: 1;
  min-width: 0;
}

.library-item-name {
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9em;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
}

.library-item-duration {
  font-size: 0.8em;
  color: #555;
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
}

.library-empty {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 0.95em;
}

.track-actions {
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 15px;
}

.tracks-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.time-ruler-wrapper {
  border-bottom: 2px solid #ddd;
  background: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 100;
}

.time-ruler-wrapper .tracks-scroll-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.time-ruler-wrapper .tracks-scroll-wrapper::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.time-ruler {
  position: relative;
  height: 40px;
  background: #f8f9fa;
  cursor: pointer;
  user-select: none;
}

.time-marker {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none; /* Allow clicks to pass through to ruler */
}

.time-tick {
  width: 1px;
  height: 12px;
  background: #999;
  margin-top: 4px;
  pointer-events: none;
}

.time-label {
  font-size: 0.7em;
  color: #666;
  margin-top: 2px;
  white-space: nowrap;
  font-weight: 500;
  pointer-events: none;
}

.tracks-scroll-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  -webkit-overflow-scrolling: touch; /* Enable smooth scrolling on iOS */
  touch-action: pan-x; /* Allow horizontal panning only - we'll control when to allow it */
}

.tracks-scroll-wrapper::-webkit-scrollbar {
  height: 12px;
}

.tracks-scroll-wrapper::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.tracks-scroll-wrapper::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 6px;
}

.tracks-scroll-wrapper::-webkit-scrollbar-thumb:hover {
  background: #5568d3;
}

.tracks-wrapper {
  position: relative;
  min-height: 100%;
}

.tracks-wrapper .playhead-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  margin-left: -4px;
  background: transparent;
  z-index: 1001;
  pointer-events: auto;
  cursor: ew-resize;
  user-select: none;
  touch-action: none;
}

.playhead-line::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 100%;
  background: #ff4444;
  box-shadow: 0 0 4px rgba(255, 68, 68, 0.6);
}

.playhead-line:hover::after {
  width: 3px;
  background: #ff6666;
}

.playhead-line::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #ff4444;
  z-index: 1;
}
</style>
