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

    <div class="file-library" v-if="uploadedFiles.length > 0">
      <div class="library-header">
        <h3>Audio Library</h3>
        <button class="btn-upload-more" @click="triggerFileInput" title="Upload more files">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Files
        </button>
      </div>
      <div class="library-grid">
        <div
          v-for="file in uploadedFiles"
          :key="file.id"
          class="library-item"
          draggable="true"
          @dragstart="handleLibraryDragStart($event, file)"
        >
          <div class="library-item-icon">🎵</div>
          <div class="library-item-info">
            <div class="library-item-name">{{ file.name }}</div>
            <div class="library-item-duration">{{ formatTime(file.duration) }}</div>
          </div>
        </div>
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

    <div class="tracks-container" ref="tracksContainerRef">
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

    <div class="upload-section" v-if="uploadedFiles.length === 0">
      <div
        class="upload-area"
        :class="{ dragover: isDragging }"
        @click="triggerFileInput"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <div class="upload-content">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p class="upload-text">Click to upload multiple audio files</p>
          <p class="upload-hint">Supported formats: MP3, WAV, OGG, M4A</p>
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
            duration: audio.duration || 0
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

const handleDropBlock = ({ fileId, file, duration, trackIndex }) => {
  const track = tracks.value[trackIndex]
  if (!track) return

  // Check if block already exists
  const existingBlock = blocks.value.find(b => b.fileId === fileId && b.trackId === track.id)
  if (existingBlock) {
    // Move existing block
    return
  }

  // Find the uploaded file
  const uploadedFile = uploadedFiles.value.find(f => f.id === fileId)
  if (!uploadedFile) return

  blocks.value.push({
    fileId,
    trackId: track.id,
    startTime: 0,
    file: uploadedFile.file,
    duration: uploadedFile.duration
  })
}

const handleBlockDragStart = ({ fileId }) => {
  // Block drag started
}

const handleBlockDragMove = ({ fileId, newStartTime }) => {
  const block = blocks.value.find(b => b.fileId === fileId)
  if (block) {
    block.startTime = Math.max(0, newStartTime)
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
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s ease;
}

.library-item:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.library-item:active {
  cursor: grabbing;
}

.library-item-icon {
  font-size: 2em;
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
}

.library-item-duration {
  font-size: 0.8em;
  color: #666;
  margin-top: 4px;
}

.tracks-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.upload-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 400px;
}

.upload-area {
  border: 3px dashed #667eea;
  border-radius: 15px;
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  max-width: 500px;
  width: 100%;
}

.upload-area:hover {
  background: #f0f2ff;
  border-color: #764ba2;
  transform: translateY(-2px);
}

.upload-area.dragover {
  background: #e8ebff;
  border-color: #764ba2;
  transform: scale(1.02);
}

.upload-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  color: #667eea;
}

.upload-text {
  font-size: 1.3em;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.upload-hint {
  color: #666;
  font-size: 0.9em;
}
</style>
