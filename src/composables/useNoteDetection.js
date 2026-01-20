import { ref, computed } from 'vue'

export function useNoteDetection(audioPlayer, audioContext) {
  const analyser = ref(null)
  const sourceNode = ref(null)
  const dataArray = ref(null)
  const animationFrameId = ref(null)
  const detectedNote = ref('')
  const detectedFrequency = ref(0)
  const noteDetectionActive = ref(false)

  const isNoteDetectionActive = computed(() => {
    return noteDetectionActive.value && 
           !!audioPlayer.value && 
           !audioPlayer.value.paused && 
           !!analyser.value
  })

  // Convert frequency to musical note name
  const frequencyToNote = (frequency) => {
    if (!frequency || frequency < 20 || frequency > 20000) {
      return null
    }
    
    // A4 = 440 Hz
    const A4 = 440
    const semitonesFromA4 = 12 * Math.log2(frequency / A4)
    const noteNumber = Math.round(semitonesFromA4) + 69 // MIDI note number (A4 = 69)
    
    // Ensure note number is in valid range (MIDI 0-127)
    const clampedNoteNumber = Math.max(0, Math.min(127, noteNumber))
    
    // Calculate octave and note name
    const octave = Math.floor((clampedNoteNumber - 12) / 12)
    const noteIndex = clampedNoteNumber % 12
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const noteName = noteNames[noteIndex]
    
    return `${noteName}${octave}`
  }

  // Detect pitch using FFT-based frequency analysis
  const detectPitch = () => {
    if (!analyser.value || !dataArray.value || !audioContext.value) return null
    
    // Get frequency data instead of time domain
    const frequencyData = new Uint8Array(analyser.value.frequencyBinCount)
    analyser.value.getByteFrequencyData(frequencyData)
    
    const sampleRate = audioContext.value.sampleRate
    const bufferLength = frequencyData.length
    const nyquist = sampleRate / 2
    const binSize = nyquist / bufferLength
    
    // Find the peak frequency (fundamental)
    let maxMagnitude = 0
    let peakBin = 0
    
    // Search in musical frequency range (80 Hz to 2000 Hz)
    const minBin = Math.floor(80 / binSize)
    const maxBin = Math.min(Math.floor(2000 / binSize), bufferLength - 1)
    
    for (let i = minBin; i <= maxBin; i++) {
      if (frequencyData[i] > maxMagnitude) {
        maxMagnitude = frequencyData[i]
        peakBin = i
      }
    }
    
    // Check if signal is strong enough (threshold: at least 30% of max)
    if (maxMagnitude < 50) {
      return null
    }
    
    // Calculate frequency from bin
    const frequency = peakBin * binSize
    
    // Try to find the fundamental frequency by looking for harmonics
    let fundamentalFrequency = frequency
    let bestScore = 0
    
    // Check potential fundamentals (divide by common harmonics: 2, 3, 4, 5)
    for (let divisor = 1; divisor <= 5; divisor++) {
      const candidateFreq = frequency / divisor
      
      if (candidateFreq < 80 || candidateFreq > 2000) continue
      
      const candidateBin = Math.floor(candidateFreq / binSize)
      if (candidateBin >= 0 && candidateBin < bufferLength) {
        const magnitude = frequencyData[candidateBin]
        const score = magnitude / divisor
        
        if (score > bestScore && magnitude > 40) {
          bestScore = score
          fundamentalFrequency = candidateFreq
        }
      }
    }
    
    return fundamentalFrequency
  }

  // Set up audio analysis for real-time note detection
  const setupAudioAnalysis = () => {
    if (!audioPlayer.value || !audioContext.value) return
    
    try {
      // Create analyser node
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 16384
      analyser.value.smoothingTimeConstant = 0.2
      analyser.value.minDecibels = -90
      analyser.value.maxDecibels = -10
      
      // Create buffer for frequency data
      const bufferLength = analyser.value.frequencyBinCount
      dataArray.value = new Uint8Array(bufferLength)
      
      // Create source node from audio element
      if (sourceNode.value) {
        sourceNode.value.disconnect()
      }
      sourceNode.value = audioContext.value.createMediaElementSource(audioPlayer.value)
      sourceNode.value.connect(analyser.value)
      analyser.value.connect(audioContext.value.destination)
      
      // Start note detection if playing
      if (!audioPlayer.value.paused) {
        if (audioContext.value.state === 'suspended') {
          audioContext.value.resume()
        }
        startNoteDetection()
      }
    } catch (error) {
      console.error('Error setting up audio analysis:', error)
    }
  }

  // Start note detection loop
  const startNoteDetection = () => {
    if (!audioPlayer.value || audioPlayer.value.paused || !analyser.value) {
      noteDetectionActive.value = false
      return
    }
    
    noteDetectionActive.value = true
    
    const detect = () => {
      if (!audioPlayer.value || audioPlayer.value.paused) {
        noteDetectionActive.value = false
        detectedNote.value = ''
        detectedFrequency.value = 0
        if (animationFrameId.value) {
          cancelAnimationFrame(animationFrameId.value)
          animationFrameId.value = null
        }
        return
      }
      
      const frequency = detectPitch()
      if (frequency && frequency >= 80 && frequency <= 2000) {
        detectedFrequency.value = frequency
        const note = frequencyToNote(frequency)
        detectedNote.value = note || ''
      } else {
        detectedNote.value = ''
        detectedFrequency.value = 0
      }
      
      animationFrameId.value = requestAnimationFrame(detect)
    }
    
    detect()
  }

  // Stop note detection
  const stopNoteDetection = () => {
    noteDetectionActive.value = false
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
    detectedNote.value = ''
    detectedFrequency.value = 0
  }

  const cleanup = () => {
    stopNoteDetection()
    
    if (sourceNode.value) {
      sourceNode.value.disconnect()
      sourceNode.value = null
    }
    analyser.value = null
    dataArray.value = null
  }

  return {
    analyser,
    detectedNote,
    detectedFrequency,
    isNoteDetectionActive,
    setupAudioAnalysis,
    startNoteDetection,
    stopNoteDetection,
    cleanup
  }
}
