<template>
  <div class="multi-track-editor">
    <div class="editor-header">
      <div class="header-controls">
        <button 
          class="play-btn"
          @click="togglePlayPause"
          :disabled="tracks.length === 0 || blocks.length === 0"
        >
          <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        </button>
        <button class="stop-btn" @click="stop" :disabled="!isPlaying">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
        </button>
        <div class="time-display">{{ formatTime(currentTime) }}</div>
      </div>
      <div class="header-actions">
        <button class="btn-add-track" @click="addTrack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Track
        </button>
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
          :style="{ backgroundColor: file.color }"
          draggable="true"
          @dragstart="handleLibraryDragStart($event, file)"
        >
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
    <input
      ref="fileInput"
      type="file"
      accept="audio/*"
      multiple
      style="display: none"
      @change="handleFileSelect"
    />

    <div 
      class="tracks-container" 
      ref="tracksContainerRef"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <Track
        v-for="(track, index) in tracks"
        :key="track.id"
        :trackIndex="index"
        :name="track.name"
        :blocks="getBlocksForTrack(track.id)"
        :pixelsPerSecond="pixelsPerSecond"
        :playingBlocks="playingBlocks"
        @drop-block="handleDropBlock"
        @update-name="handleTrackNameUpdate"
        @delete="handleTrackDelete"
        @block-drag-start="handleBlockDragStart"
        @block-drag-move="handleBlockDragMove"
        @block-drag-end="handleBlockDragEnd"
        @block-delete="handleBlockDelete"
        @volume-change="handleVolumeChange"
        @mute-toggle="handleMuteToggle"
      />
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
const isDragging = ref(false)
const pixelsPerSecond = ref(50)

// Track and block management
const tracks = ref([])
const blocks = ref([]) // { fileId, trackId, startTime, file, duration }
const uploadedFiles = ref([]) // { id, file, duration }

// Playback state
const isPlaying = ref(false)
const currentTime = ref(0)
const playbackStartTime = ref(0)
const animationFrameId = ref(null)
const playingBlocks = ref(new Set())

// Multi-track audio
const {
  loadAudioFile,
  playBlock,
  stopBlock,
  stopAll,
  setVolume,
  cleanup
} = useMultiTrack()

// Generate unique IDs
let trackIdCounter = 0
let fileIdCounter = 0

const generateTrackId = () => `track-${trackIdCounter++}`
const generateFileId = () => `file-${fileIdCounter++}`

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

// Initialize with one track
onMounted(() => {
  if (tracks.value.length === 0) {
    addTrack()
  }
})

// Get blocks for a specific track
const getBlocksForTrack = (trackId) => {
  return blocks.value.filter(block => block.trackId === trackId)
}

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
    duration: file.duration
  }))
}

const handleDropBlock = ({ fileId, file, duration, trackIndex, dropTime = 0, sourceTrackIndex = null }) => {
  const track = tracks.value[trackIndex]
  if (!track) return

  // Check if this is a block being moved from another track
  if (sourceTrackIndex !== null && sourceTrackIndex !== trackIndex) {
    // Find the block in the source track
    const sourceTrack = tracks.value[sourceTrackIndex]
    if (!sourceTrack) return
    
    const existingBlock = blocks.value.find(b => b.fileId === fileId && b.trackId === sourceTrack.id)
    if (existingBlock) {
      // Remove from source track
      blocks.value = blocks.value.filter(b => !(b.fileId === fileId && b.trackId === sourceTrack.id))
      
      // Add to new track with non-overlapping position
      const startTime = findNonOverlappingPosition(track.id, dropTime, duration)
      blocks.value.push({
        fileId: existingBlock.fileId,
        trackId: track.id,
        startTime,
        file: existingBlock.file,
        duration: existingBlock.duration
      })
      return
    }
  }

  // Check if block already exists on this track
  const existingBlock = blocks.value.find(b => b.fileId === fileId && b.trackId === track.id)
  if (existingBlock) {
    // Move existing block - validate position
    const newStartTime = findNonOverlappingPosition(track.id, dropTime, duration, existingBlock.fileId)
    existingBlock.startTime = newStartTime
    return
  }

  // Find the uploaded file
  const uploadedFile = uploadedFiles.value.find(f => f.id === fileId)
  if (!uploadedFile) return

  // Find a non-overlapping position for the new block
  const startTime = findNonOverlappingPosition(track.id, dropTime, uploadedFile.duration)

  blocks.value.push({
    fileId,
    trackId: track.id,
    startTime,
    file: uploadedFile.file,
    duration: uploadedFile.duration
  })
}

// Helper function to find a non-overlapping position
const findNonOverlappingPosition = (trackId, preferredTime, blockDuration, excludeFileId = null) => {
  // Get all blocks on this track (excluding the one being moved if applicable)
  const trackBlocks = blocks.value.filter(
    b => b.trackId === trackId && b.fileId !== excludeFileId
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

const handleBlockDragStart = ({ fileId }) => {
  // Block drag started
}

const handleBlockDragMove = ({ fileId, newStartTime }) => {
  const block = blocks.value.find(b => b.fileId === fileId)
  if (block) {
    // Find non-overlapping position for the dragged block
    const validStartTime = findNonOverlappingPosition(
      block.trackId,
      newStartTime,
      block.duration,
      fileId // Exclude the block being dragged
    )
    block.startTime = Math.max(0, validStartTime)
  }
}

const handleBlockDragEnd = ({ fileId }) => {
  // Block drag ended
}

const handleBlockDelete = ({ trackIndex, fileId }) => {
  const track = tracks.value[trackIndex]
  if (track) {
    blocks.value = blocks.value.filter(
      block => !(block.fileId === fileId && block.trackId === track.id)
    )
    stopBlock(fileId)
  }
}

// Volume and mute
const handleVolumeChange = ({ trackIndex, volume }) => {
  const track = tracks.value[trackIndex]
  if (track) {
    track.volume = volume
    // Update volume for all blocks in this track
    const trackBlocks = blocks.value.filter(b => b.trackId === track.id)
    trackBlocks.forEach(block => {
      setVolume(block.fileId, track.isMuted ? 0 : volume)
    })
  }
}

const handleMuteToggle = ({ trackIndex, isMuted }) => {
  const track = tracks.value[trackIndex]
  if (track) {
    track.isMuted = isMuted
    const trackBlocks = blocks.value.filter(b => b.trackId === track.id)
    trackBlocks.forEach(block => {
      setVolume(block.fileId, isMuted ? 0 : track.volume)
    })
  }
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
          await playBlock(block.fileId, delay, offset)
          playingBlocks.value.add(block.fileId)
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
        stop()
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
  playingBlocks.value.forEach(fileId => {
    stopBlock(fileId)
  })
  playingBlocks.value.clear()
}

const stop = () => {
  pause()
  currentTime.value = 0
  playbackStartTime.value = 0
  stopAll()
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
.stop-btn {
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
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
  box-shadow: 0 3px 10px rgba(255, 107, 107, 0.4);
}

.stop-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(255, 107, 107, 0.6);
}

.stop-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn svg,
.stop-btn svg {
  width: 24px;
  height: 24px;
}

.time-display {
  font-size: 1.2em;
  font-weight: 600;
  color: #333;
  min-width: 80px;
}

.btn-add-track {
  display: flex;
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

.tracks-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
