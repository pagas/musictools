import { ref, watch } from 'vue'

// Helper to get value from either ref or getter function
const getValue = (valueOrGetter) => {
  return typeof valueOrGetter === 'function' ? valueOrGetter() : valueOrGetter?.value
}

// Note names
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Common chord patterns (intervals in semitones from root)
const chordPatterns = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'diminished': [0, 3, 6],
  'augmented': [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'major7': [0, 4, 7, 11],
  'minor7': [0, 3, 7, 10],
  'dominant7': [0, 4, 7, 10],
  'diminished7': [0, 3, 6, 9],
  'major9': [0, 4, 7, 11, 14],
  'minor9': [0, 3, 7, 10, 14]
}

// Convert frequency to MIDI note number
const frequencyToMIDI = (frequency) => {
  if (!frequency || frequency < 20 || frequency > 20000) return null
  const A4 = 440
  const semitonesFromA4 = 12 * Math.log2(frequency / A4)
  const noteNumber = Math.round(semitonesFromA4) + 69 // MIDI note number (A4 = 69)
  return Math.max(0, Math.min(127, noteNumber))
}

// Convert MIDI note to note name
const midiToNote = (midiNote) => {
  const octave = Math.floor((midiNote - 12) / 12)
  const noteIndex = midiNote % 12
  return `${noteNames[noteIndex]}${octave}`
}

// Format time for console logging
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Simple time-domain to frequency-domain conversion
const analyzeTimeDomainToFrequency = (timeData, sampleRate, fftSize) => {
  if (!timeData || timeData.length === 0) return new Uint8Array(fftSize / 2)
  
  const nyquist = sampleRate / 2
  const binSize = nyquist / (fftSize / 2)
  const frequencyData = new Uint8Array(fftSize / 2)
  
  // Use windowed analysis
  const windowSize = Math.min(fftSize, timeData.length)
  const numWindows = Math.floor(timeData.length / windowSize)
  
  if (numWindows === 0) return frequencyData
  
  // Analyze frequency content using autocorrelation-like approach
  for (let bin = 0; bin < frequencyData.length; bin++) {
    const frequency = bin * binSize
    if (frequency < 80 || frequency > 2000) continue
    
    let energy = 0
    const period = sampleRate / frequency
    const samplesPerPeriod = Math.floor(period)
    
    if (samplesPerPeriod < 2 || samplesPerPeriod >= windowSize) continue
    
    // Calculate energy at this frequency using correlation
    for (let w = 0; w < numWindows; w++) {
      const start = w * windowSize
      const window = timeData.slice(start, start + windowSize)
      
      for (let i = 0; i < window.length - samplesPerPeriod; i++) {
        // Simple correlation
        const correlation = Math.abs(window[i] * window[i + samplesPerPeriod])
        energy += correlation
      }
    }
    
    // Normalize and convert to 0-255 range
    const normalizedEnergy = Math.min(255, Math.floor(energy / (numWindows * windowSize) * 10000))
    frequencyData[bin] = normalizedEnergy
  }
  
  return frequencyData
}

// Detect chord from frequency data
const detectChord = (frequencyData, sampleRate, fftSize) => {
  if (!frequencyData || frequencyData.length === 0) return null

  const nyquist = sampleRate / 2
  const binSize = nyquist / (fftSize / 2)
  
  // Find all significant peaks (notes) - use lower threshold
  const peaks = []
  const maxValue = Math.max(...Array.from(frequencyData))
  const threshold = maxValue * 0.15 // Lower threshold: 15% of max (was 30%)
  
  // Also calculate average for adaptive threshold
  const avgValue = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length
  const adaptiveThreshold = Math.max(threshold, avgValue * 2)
  
  for (let i = 0; i < frequencyData.length; i++) {
    const value = frequencyData[i]
    if (value > adaptiveThreshold) {
      const frequency = i * binSize
      // Only consider musical range (80 Hz to 2000 Hz)
      if (frequency >= 80 && frequency <= 2000) {
        const midiNote = frequencyToMIDI(frequency)
        if (midiNote !== null) {
          peaks.push({
            frequency,
            midiNote,
            magnitude: value,
            noteName: midiToNote(midiNote)
          })
        }
      }
    }
  }
  
  if (peaks.length < 2) return null // Lower requirement: at least 2 notes (was 3)
  
  // Group peaks by MIDI note (remove duplicates within 1 semitone)
  const uniqueNotes = []
  for (const peak of peaks.sort((a, b) => b.magnitude - a.magnitude)) {
    const existing = uniqueNotes.find(n => Math.abs(n.midiNote - peak.midiNote) <= 1)
    if (!existing) {
      uniqueNotes.push(peak)
    } else if (peak.magnitude > existing.magnitude) {
      const index = uniqueNotes.indexOf(existing)
      uniqueNotes[index] = peak
    }
  }
  
  if (uniqueNotes.length < 2) return null // Lower requirement: at least 2 unique notes
  
  // Try to match chord patterns
  let bestMatch = null
  let bestScore = 0
  
  // Try each note as root (try more notes)
  for (const rootNote of uniqueNotes.slice(0, Math.min(8, uniqueNotes.length))) {
    const rootMIDI = rootNote.midiNote % 12 // Get note class (0-11)
    
    // Get all note classes present
    const presentNotes = uniqueNotes.map(n => n.midiNote % 12)
    
    // Try each chord pattern
    for (const [chordType, intervals] of Object.entries(chordPatterns)) {
      // Check if the chord pattern matches
      const requiredNotes = intervals.map(interval => (rootMIDI + interval) % 12)
      const matchCount = requiredNotes.filter(note => presentNotes.includes(note)).length
      const matchRatio = matchCount / requiredNotes.length
      
      // Also check for extra notes (extensions)
      const extraNotes = presentNotes.filter(note => !requiredNotes.includes(note))
      const hasExtensions = extraNotes.length > 0 && extraNotes.length <= 3
      
      // Score based on match ratio and presence of extensions
      const score = matchRatio * 100 + (hasExtensions ? 5 : 0)
      
      // Lower match requirement: at least 60% match (was 75%)
      if (matchRatio >= 0.6 && score > bestScore) {
        bestScore = score
        bestMatch = {
          root: noteNames[rootMIDI],
          type: chordType,
          fullName: `${noteNames[rootMIDI]}${chordType === 'major' ? '' : chordType === 'minor' ? 'm' : chordType === 'dominant7' ? '7' : chordType === 'major7' ? 'maj7' : chordType === 'minor7' ? 'm7' : chordType}`,
          confidence: Math.round(matchRatio * 100),
          notes: requiredNotes.map(n => noteNames[n])
        }
      }
    }
  }
  
  return bestMatch
}

// Detect tempo (BPM) from audio using improved algorithm
const detectTempo = (channelData, sampleRate) => {
  if (!channelData || channelData.length === 0) return null
  
  const duration = channelData.length / sampleRate
  if (duration < 2) return null // Need at least 2 seconds
  
  // Method 1: Onset detection using spectral flux
  const windowSize = Math.floor(sampleRate * 0.046) // ~46ms windows (better for beat detection)
  const hopSize = Math.floor(windowSize / 2) // 50% overlap
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize)
  
  // Calculate onset strength (spectral flux approximation using energy difference)
  const onsetStrength = []
  let prevEnergy = 0
  
  for (let i = 0; i < numWindows; i++) {
    const start = i * hopSize
    const window = channelData.slice(start, start + windowSize)
    
    // Calculate RMS energy
    let energy = 0
    for (let j = 0; j < window.length; j++) {
      energy += window[j] * window[j]
    }
    energy = Math.sqrt(energy / window.length)
    
    // Spectral flux: positive difference indicates onset
    const flux = Math.max(0, energy - prevEnergy)
    onsetStrength.push(flux)
    prevEnergy = energy
  }
  
  // Smooth the onset strength to reduce noise
  const smoothed = []
  const smoothingWindow = 3
  for (let i = 0; i < onsetStrength.length; i++) {
    let sum = 0
    let count = 0
    for (let j = Math.max(0, i - smoothingWindow); j <= Math.min(onsetStrength.length - 1, i + smoothingWindow); j++) {
      sum += onsetStrength[j]
      count++
    }
    smoothed.push(sum / count)
  }
  
  // Find peaks (potential beats) with adaptive threshold
  const peaks = []
  const maxOnset = Math.max(...smoothed)
  const meanOnset = smoothed.reduce((a, b) => a + b, 0) / smoothed.length
  const threshold = Math.max(meanOnset * 1.5, maxOnset * 0.2) // Adaptive threshold
  
  for (let i = 2; i < smoothed.length - 2; i++) {
    if (smoothed[i] > threshold &&
        smoothed[i] > smoothed[i - 1] &&
        smoothed[i] > smoothed[i + 1] &&
        smoothed[i] > smoothed[i - 2] &&
        smoothed[i] > smoothed[i + 2]) {
      peaks.push(i)
    }
  }
  
  if (peaks.length < 3) {
    // Fallback: try with lower threshold
    const lowerThreshold = Math.max(meanOnset * 1.2, maxOnset * 0.15)
    peaks.length = 0
    for (let i = 2; i < smoothed.length - 2; i++) {
      if (smoothed[i] > lowerThreshold &&
          smoothed[i] > smoothed[i - 1] &&
          smoothed[i] > smoothed[i + 1]) {
        peaks.push(i)
      }
    }
  }
  
  if (peaks.length < 3) return null
  
  // Method 2: Autocorrelation to find periodic patterns
  const autocorrelation = []
  const maxLag = Math.floor(sampleRate * 2) // Check up to 2 seconds
  const minLag = Math.floor(sampleRate * 0.3) // Minimum 0.3 seconds (200 BPM max)
  
  // Normalize onset strength for autocorrelation
  const normalized = smoothed.map(v => v - meanOnset)
  
  for (let lag = minLag; lag < maxLag && lag < normalized.length; lag++) {
    let sum = 0
    for (let i = 0; i < normalized.length - lag; i++) {
      sum += normalized[i] * normalized[i + lag]
    }
    autocorrelation.push({ lag, value: sum / (normalized.length - lag) })
  }
  
  // Find peaks in autocorrelation (periodic patterns)
  const autocorrPeaks = []
  for (let i = 1; i < autocorrelation.length - 1; i++) {
    if (autocorrelation[i].value > autocorrelation[i - 1].value &&
        autocorrelation[i].value > autocorrelation[i + 1].value &&
        autocorrelation[i].value > 0) {
      autocorrPeaks.push(autocorrelation[i])
    }
  }
  
  // Sort by value and get top candidates
  autocorrPeaks.sort((a, b) => b.value - a.value)
  
  // Method 3: Calculate intervals from peaks
  const intervals = []
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1])
  }
  
  // Find most common interval with tolerance
  const intervalCounts = {}
  for (const interval of intervals) {
    const rounded = Math.round(interval)
    // Allow ±10% tolerance
    const tolerance = Math.max(1, Math.round(rounded * 0.1))
    for (let offset = -tolerance; offset <= tolerance; offset++) {
      const key = rounded + offset
      if (key > 0) {
        intervalCounts[key] = (intervalCounts[key] || 0) + 1
      }
    }
  }
  
  // Combine results from all methods
  const candidates = []
  
  // From interval analysis
  for (const [intervalStr, count] of Object.entries(intervalCounts)) {
    const interval = parseInt(intervalStr)
    const windowTime = hopSize / sampleRate
    const beatPeriod = interval * windowTime
    const bpm = 60 / beatPeriod
    
    if (bpm >= 60 && bpm <= 200 && count >= 2) {
      candidates.push({ bpm: Math.round(bpm), confidence: count / intervals.length, method: 'intervals' })
    }
  }
  
  // From autocorrelation
  for (const peak of autocorrPeaks.slice(0, 5)) {
    const beatPeriod = peak.lag / sampleRate
    const bpm = 60 / beatPeriod
    
    // Check for multiples (half/double tempo)
    const bpmVariants = [bpm, bpm * 2, bpm / 2, bpm * 3, bpm / 3]
    
    for (const variant of bpmVariants) {
      if (variant >= 60 && variant <= 200) {
        const confidence = peak.value / (autocorrPeaks[0]?.value || 1)
        candidates.push({ bpm: Math.round(variant), confidence, method: 'autocorr' })
      }
    }
  }
  
  if (candidates.length === 0) return null
  
  // Group similar BPMs and find best candidate
  const grouped = {}
  for (const candidate of candidates) {
    const rounded = Math.round(candidate.bpm / 5) * 5 // Group by 5 BPM
    if (!grouped[rounded]) {
      grouped[rounded] = []
    }
    grouped[rounded].push(candidate)
  }
  
  let bestBPM = null
  let bestScore = 0
  
  for (const [bpmGroup, groupCandidates] of Object.entries(grouped)) {
    const avgBPM = Math.round(
      groupCandidates.reduce((sum, c) => sum + c.bpm, 0) / groupCandidates.length
    )
    const totalConfidence = groupCandidates.reduce((sum, c) => sum + c.confidence, 0)
    const score = totalConfidence * groupCandidates.length
    
    if (score > bestScore && avgBPM >= 60 && avgBPM <= 200) {
      bestScore = score
      bestBPM = avgBPM
    }
  }
  
  return bestBPM
}

// Detect musical key from detected chords
const detectKey = (chords) => {
  if (!chords || chords.length === 0) return null
  
  // Count occurrences of each note class (0-11)
  const noteCounts = new Array(12).fill(0)
  
  for (const chordGroup of chords) {
    const root = chordGroup.chord.root
    const rootIndex = noteNames.indexOf(root)
    if (rootIndex !== -1) {
      noteCounts[rootIndex] += chordGroup.duration // Weight by duration
    }
  }
  
  // Major and minor key signatures (sharps/flats)
  const majorKeys = {
    'C': [0, 2, 4, 5, 7, 9, 11], // C major
    'G': [7, 9, 11, 0, 2, 4, 6], // G major
    'D': [2, 4, 6, 7, 9, 11, 1], // D major
    'A': [9, 11, 1, 2, 4, 6, 8], // A major
    'E': [4, 6, 8, 9, 11, 1, 3], // E major
    'B': [11, 1, 3, 4, 6, 8, 10], // B major
    'F#': [6, 8, 10, 11, 1, 3, 5], // F# major
    'C#': [1, 3, 5, 6, 8, 10, 0], // C# major
    'F': [5, 7, 9, 10, 0, 2, 4], // F major
    'Bb': [10, 0, 2, 3, 5, 7, 9], // Bb major
    'Eb': [3, 5, 7, 8, 10, 0, 2], // Eb major
    'Ab': [8, 10, 0, 1, 3, 5, 7] // Ab major
  }
  
  const minorKeys = {
    'Am': [9, 11, 0, 2, 4, 5, 7], // A minor
    'Em': [4, 6, 7, 9, 11, 0, 2], // E minor
    'Bm': [11, 1, 2, 4, 6, 7, 9], // B minor
    'F#m': [6, 8, 9, 11, 1, 2, 4], // F# minor
    'C#m': [1, 3, 4, 6, 8, 9, 11], // C# minor
    'G#m': [8, 10, 11, 1, 3, 4, 6], // G# minor
    'D#m': [3, 5, 6, 8, 10, 11, 1], // D# minor
    'A#m': [10, 0, 1, 3, 5, 6, 8], // A# minor
    'Dm': [2, 4, 5, 7, 9, 10, 0], // D minor
    'Gm': [7, 9, 10, 0, 2, 4, 5], // G minor
    'Cm': [0, 2, 3, 5, 7, 8, 10], // C minor
    'Fm': [5, 7, 8, 10, 0, 2, 3] // F minor
  }
  
  // Score each key
  let bestKey = null
  let bestScore = 0
  
  // Check major keys
  for (const [keyName, scaleNotes] of Object.entries(majorKeys)) {
    let score = 0
    for (const noteIndex of scaleNotes) {
      score += noteCounts[noteIndex]
    }
    // Bonus for root note
    const rootIndex = noteNames.indexOf(keyName)
    if (rootIndex !== -1) {
      score += noteCounts[rootIndex] * 0.5
    }
    if (score > bestScore) {
      bestScore = score
      bestKey = keyName
    }
  }
  
  // Check minor keys
  for (const [keyName, scaleNotes] of Object.entries(minorKeys)) {
    let score = 0
    for (const noteIndex of scaleNotes) {
      score += noteCounts[noteIndex]
    }
    // Bonus for root note
    const rootNote = keyName.replace('m', '')
    const rootIndex = noteNames.indexOf(rootNote)
    if (rootIndex !== -1) {
      score += noteCounts[rootIndex] * 0.5
    }
    if (score > bestScore) {
      bestScore = score
      bestKey = keyName
    }
  }
  
  return bestKey
}

export function useChordDetection(audioFile) {
  const detectedChords = ref([])
  const detectedTempo = ref(null)
  const detectedKey = ref(null)
  const isAnalyzing = ref(false)

  // Analyze audio file for chords
  const analyzeChords = async () => {
    const file = getValue(audioFile)
    
    if (!file) {
      console.log('Cannot analyze: missing file')
      return
    }
    
    console.log('Starting chord analysis...', file.name)
    isAnalyzing.value = true
    detectedChords.value = []
    
    try {
      // Create a temporary audio context for analysis
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const tempContext = new AudioContextClass()
      
      // Decode audio file
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await tempContext.decodeAudioData(arrayBuffer)
      
      console.log('Audio decoded:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels
      })
      
      // Get channel data (use first channel or mix if stereo)
      let channelData = audioBuffer.getChannelData(0)
      if (audioBuffer.numberOfChannels > 1) {
        // Mix channels
        const channel1 = audioBuffer.getChannelData(0)
        const channel2 = audioBuffer.getChannelData(1)
        channelData = new Float32Array(channel1.length)
        for (let i = 0; i < channel1.length; i++) {
          channelData[i] = (channel1[i] + channel2[i]) / 2
        }
      }
      
      const sampleRate = audioBuffer.sampleRate
      const duration = audioBuffer.duration
      const fftSize = 16384
      
      // Sample every 1 second for chord detection (adjustable for speed vs accuracy)
      const sampleInterval = 1.0 // seconds
      const windowDuration = 2.0 // Analyze 2 seconds of audio per sample
      const windowSamples = Math.floor(sampleRate * windowDuration)
      const numSamples = Math.floor(duration / sampleInterval)
      
      console.log(`Analyzing ${numSamples} samples (every ${sampleInterval}s) across ${duration.toFixed(1)}s song...`)
      
      const windows = []
      
      // Process each sample point
      for (let s = 0; s < numSamples; s++) {
        const time = s * sampleInterval
        const startSample = Math.floor(time * sampleRate)
        const endSample = Math.min(startSample + windowSamples, channelData.length)
        
        if (endSample <= startSample) break
        
        const windowData = channelData.slice(startSample, endSample)
        
        // Create offline context for this window
        const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext
        const offlineContext = new OfflineAudioContextClass(
          1, // mono
          windowData.length,
          sampleRate
        )
        
        const bufferSource = offlineContext.createBufferSource()
        const tempBuffer = offlineContext.createBuffer(1, windowData.length, sampleRate)
        tempBuffer.copyToChannel(windowData, 0)
        bufferSource.buffer = tempBuffer
        
        const analyserNode = offlineContext.createAnalyser()
        analyserNode.fftSize = fftSize
        analyserNode.smoothingTimeConstant = 0
        
        bufferSource.connect(analyserNode)
        analyserNode.connect(offlineContext.destination)
        
        bufferSource.start(0)
        const renderedBuffer = await offlineContext.startRendering()
        
        // Get time-domain data from rendered buffer and convert to frequency domain
        const renderedChannelData = renderedBuffer.getChannelData(0)
        
        // Convert time-domain data to frequency domain using our helper function
        const frequencyData = analyzeTimeDomainToFrequency(renderedChannelData, sampleRate, fftSize)
        
        // Debug: log frequency data stats for first sample
        if (s === 0) {
          const maxFreq = Math.max(...Array.from(frequencyData))
          const avgFreq = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length
          const nonZeroCount = Array.from(frequencyData).filter(v => v > 0).length
          console.log(`Sample 0 frequency data: max=${maxFreq}, avg=${avgFreq.toFixed(2)}, nonZero=${nonZeroCount}/${frequencyData.length}`)
        }
        
        // Detect chord
        const chord = detectChord(frequencyData, sampleRate, fftSize)
        
        if (chord) {
          windows.push({
            time,
            chord
          })
          // Debug: log first few detections
          if (windows.length <= 3) {
            console.log(`Detected chord at ${time.toFixed(1)}s:`, chord.fullName)
          }
        }
        
        // Progress update every 10 samples
        if (s % 10 === 0 || s === numSamples - 1) {
          console.log(`Progress: ${Math.round(((s + 1) / numSamples) * 100)}% (${s + 1}/${numSamples} samples)`)
        }
      }
      
      // Group consecutive similar chords
      const groupedChords = []
      let currentGroup = null
      
      for (const window of windows) {
        if (!currentGroup || 
            currentGroup.chord.fullName !== window.chord.fullName ||
            window.time - currentGroup.endTime > 1.0) { // Gap > 1.0s starts new group (was 0.5s)
          if (currentGroup) {
            groupedChords.push(currentGroup)
          }
          currentGroup = {
            chord: window.chord,
            startTime: window.time,
            endTime: window.time + sampleInterval, // Add sample interval to end time
            duration: sampleInterval
          }
        } else {
          currentGroup.endTime = window.time + sampleInterval
          currentGroup.duration = currentGroup.endTime - currentGroup.startTime
        }
      }
      
      if (currentGroup) {
        groupedChords.push(currentGroup)
      }
      
      // Filter out very short chords (< 0.5s) and sort by start time (was 0.2s)
      detectedChords.value = groupedChords
        .filter(g => g.duration >= 0.5)
        .sort((a, b) => a.startTime - b.startTime)
      
      // Debug: log what we found
      if (windows.length > 0) {
        console.log(`Found ${windows.length} chord detections before grouping:`, windows.slice(0, 5))
      } else {
        console.log('No chords detected in any window. Checking frequency data...')
      }
      
      // Detect tempo
      console.log('Detecting tempo...')
      console.log(`  Audio duration: ${duration.toFixed(2)}s, sample rate: ${sampleRate}Hz`)
      const tempo = detectTempo(channelData, sampleRate)
      detectedTempo.value = tempo
      if (tempo) {
        console.log(`✅ Detected tempo: ${tempo} BPM`)
      } else {
        console.log('❌ Could not detect tempo (may need longer audio or clearer rhythm)')
      }
      
      // Detect key from chords
      console.log('Detecting key...')
      const key = detectKey(detectedChords.value)
      detectedKey.value = key
      if (key) {
        console.log(`✅ Detected key: ${key}`)
      } else {
        console.log('❌ Could not detect key (need at least one chord)')
      }
      
      console.log(`\n📊 Analysis Summary:`)
      console.log(`   - Tempo: ${tempo ? tempo + ' BPM' : 'Not detected'}`)
      console.log(`   - Key: ${key || 'Not detected'}`)
      console.log(`   - Chords: ${detectedChords.value.length} chord(s) found`)
      console.log(`   - Chord list:`, detectedChords.value.map(c => `${c.chord.fullName} (${formatTime(c.startTime)}-${formatTime(c.endTime)})`))
      
      // Clean up
      await tempContext.close()
      isAnalyzing.value = false
      
    } catch (error) {
      console.error('Error analyzing chords:', error)
      isAnalyzing.value = false
    }
  }

  // Watch for file changes to clear results (but don't auto-analyze)
  watch(() => getValue(audioFile), (newFile, oldFile) => {
    if (!newFile || newFile !== oldFile) {
      detectedChords.value = []
      detectedTempo.value = null
      detectedKey.value = null
      isAnalyzing.value = false
    }
  })

  return {
    detectedChords,
    detectedTempo,
    detectedKey,
    isAnalyzing,
    analyzeChords
  }
}
