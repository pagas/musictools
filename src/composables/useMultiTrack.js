import { ref, computed, onUnmounted } from 'vue'

/**
 * Composable for managing multi-track audio playback
 */
export function useMultiTrack() {
  const audioContext = ref(null)
  const audioBuffers = ref(new Map()) // Map<fileId, AudioBuffer>
  const sourceNodes = ref(new Map()) // Map<blockId, AudioBufferSourceNode>
  const gainNodes = ref(new Map()) // Map<trackId, GainNode>
  const masterGainNode = ref(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const playbackStartTime = ref(0)
  const animationFrameId = ref(null)

  // Initialize audio context
  const initAudioContext = async () => {
    if (!audioContext.value) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      audioContext.value = new AudioContextClass()
    }
    if (audioContext.value.state === 'suspended') {
      await audioContext.value.resume()
    }
  }

  // Load audio file into buffer
  const loadAudioFile = async (file, fileId) => {
    await initAudioContext()
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
      audioBuffers.value.set(fileId, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error('Error loading audio file:', error)
      throw error
    }
  }

  // Create master gain node
  const createMasterGainNode = () => {
    if (!audioContext.value || masterGainNode.value) return masterGainNode.value
    
    const masterGain = audioContext.value.createGain()
    masterGain.gain.value = 1.0
    masterGain.connect(audioContext.value.destination)
    masterGainNode.value = masterGain
    return masterGain
  }

  // Create gain node for a track
  const createGainNode = (trackId) => {
    if (!audioContext.value) return null
    
    // Ensure master gain node exists
    if (!masterGainNode.value) {
      createMasterGainNode()
    }
    
    const gainNode = audioContext.value.createGain()
    gainNode.gain.value = 1.0
    gainNodes.value.set(trackId, gainNode)
    // Connect to master gain instead of destination
    gainNode.connect(masterGainNode.value)
    return gainNode
  }

  // Play a specific audio block
  const playBlock = async (blockId, fileId, trackId, startTime = 0, offset = 0) => {
    await initAudioContext()
    
    const buffer = audioBuffers.value.get(fileId)
    if (!buffer) {
      console.warn(`Audio buffer not found for fileId: ${fileId}`)
      return null
    }

    // Stop existing source for this block if any
    stopBlock(blockId)

    const source = audioContext.value.createBufferSource()
    source.buffer = buffer
    
    // Get or create gain node for this track
    let gainNode = gainNodes.value.get(trackId)
    if (!gainNode) {
      gainNode = createGainNode(trackId)
    }
    
    source.connect(gainNode)
    
    const currentTimeInContext = audioContext.value.currentTime
    const playTime = currentTimeInContext + startTime
    
    source.start(playTime, offset)
    sourceNodes.value.set(blockId, source)
    
    source.onended = () => {
      sourceNodes.value.delete(blockId)
    }
    
    return source
  }

  // Stop a specific audio block
  const stopBlock = (blockId) => {
    const source = sourceNodes.value.get(blockId)
    if (source) {
      try {
        source.stop()
      } catch (e) {
        // Source might already be stopped
      }
      sourceNodes.value.delete(blockId)
    }
  }

  // Set volume for a track
  const setVolume = (trackId, volume) => {
    const gainNode = gainNodes.value.get(trackId)
    if (gainNode) {
      gainNode.gain.value = volume
    }
  }

  // Set master volume
  const setMasterVolume = (volume) => {
    if (!masterGainNode.value) {
      createMasterGainNode()
    }
    if (masterGainNode.value) {
      masterGainNode.value.gain.value = volume
    }
  }

  // Stop all playing audio
  const stopAll = () => {
    sourceNodes.value.forEach((source, blockId) => {
      stopBlock(blockId)
    })
    isPlaying.value = false
    currentTime.value = 0
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
  }

  // Cleanup
  const cleanup = () => {
    stopAll()
    audioBuffers.value.clear()
    sourceNodes.value.clear()
    gainNodes.value.clear()
    masterGainNode.value = null
    if (audioContext.value) {
      audioContext.value.close().catch(() => {})
      audioContext.value = null
    }
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    audioContext,
    audioBuffers,
    isPlaying,
    currentTime,
    initAudioContext,
    loadAudioFile,
    createGainNode,
    playBlock,
    stopBlock,
    setVolume,
    setMasterVolume,
    stopAll,
    cleanup
  }
}
