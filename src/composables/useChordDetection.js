import { ref, watch } from 'vue'

// Helper to get value from either ref or getter function
const getValue = (valueOrGetter) => {
  return typeof valueOrGetter === 'function' ? valueOrGetter() : valueOrGetter?.value
}

// TonalExtractor hopSize (samples) – one chord estimate per hop
const TONAL_HOP_SIZE = 2048

// Lazy-loaded Essentia instance (WASM + core)
let essentiaInstance = null

async function getEssentia() {
  if (essentiaInstance) return essentiaInstance
  // Doc pattern: Essentia expects WASM module with .EssentiaJS. Use .es.js build (same as official ES6 example).
  const [coreMod, wasmMod] = await Promise.all([
    import('essentia.js/dist/essentia.js-core.es.js'),
    import('essentia.js/dist/essentia-wasm.es.js')
  ])
  const Essentia = coreMod.default
  const EssentiaWASM = wasmMod.EssentiaWASM
  essentiaInstance = new Essentia(EssentiaWASM)
  return essentiaInstance
}

// Convert Emscripten VectorFloat/VectorString or array-like to JS array
function toArray(value) {
  if (value == null) return []
  if (Array.isArray(value)) return value
  const size = typeof value.size === 'function' ? value.size() : value.size
  if (typeof size === 'number' && size >= 0) {
    const out = []
    const get = typeof value.get === 'function' ? (i) => value.get(i) : (i) => value[i]
    for (let i = 0; i < size; i++) out.push(get(i))
    return out
  }
  try {
    return Array.from(value)
  } catch {
    return []
  }
}

// Convert chord progression + strength to our format and merge consecutive identical chords
function buildChordSegments(progression, strength, secondsPerChord) {
  const names = toArray(progression)
  const strengths = toArray(strength)
  if (!names.length || !(secondsPerChord > 0)) return []

  const windows = names.map((name, i) => ({
    chord: {
      fullName: String(name ?? 'N').trim() || 'N',
      confidence: Math.min(100, Math.round((strengths[i] ?? 0) * 100))
    },
    startTime: i * secondsPerChord,
    endTime: (i + 1) * secondsPerChord,
    duration: secondsPerChord
  }))

  const merged = []
  let cur = null
  for (const w of windows) {
    const same = cur && cur.chord.fullName === w.chord.fullName
    if (!cur || !same) {
      if (cur) merged.push(cur)
      cur = { ...w }
    } else {
      cur.endTime = w.endTime
      cur.duration = cur.endTime - cur.startTime
    }
  }
  if (cur) merged.push(cur)

  return merged.filter((g) => g.duration >= 0.2).sort((a, b) => a.startTime - b.startTime)
}

export function useChordDetection(audioFile) {
  const detectedChords = ref([])
  const detectedTempo = ref(null)
  const detectedKey = ref(null)
  const isAnalyzing = ref(false)

  const analyzeChords = async () => {
    const file = getValue(audioFile)
    if (!file) {
      console.log('Cannot analyze: missing file')
      return
    }

    console.log('Starting chord analysis (Essentia.js)...', file.name)
    isAnalyzing.value = true
    detectedChords.value = []
    detectedTempo.value = null
    detectedKey.value = null

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const tempContext = new AudioContextClass()
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await tempContext.decodeAudioData(arrayBuffer)

      let channelData = audioBuffer.getChannelData(0)
      if (audioBuffer.numberOfChannels > 1) {
        const ch0 = audioBuffer.getChannelData(0)
        const ch1 = audioBuffer.getChannelData(1)
        channelData = new Float32Array(ch0.length)
        for (let i = 0; i < ch0.length; i++) channelData[i] = (ch0[i] + ch1[i]) / 2
      }

      const sampleRate = audioBuffer.sampleRate

      const Essentia = await getEssentia()
      const signalVector = Essentia.arrayToVector(channelData)

      // Tempo via RhythmExtractor
      const rhythm = Essentia.RhythmExtractor(
        signalVector,
        1024, // frameHop
        1024, // frameSize
        256,  // hopSize
        0.1,  // lastBeatInterval
        208,  // maxTempo
        40,   // minTempo
        1024, // numberFrames
        sampleRate
      )
      const bpm = rhythm?.bpm != null ? Math.round(Number(rhythm.bpm)) : null
      detectedTempo.value = bpm && bpm >= 40 && bpm <= 208 ? bpm : null
      if (detectedTempo.value) console.log('Detected tempo:', detectedTempo.value, 'BPM')

      // Key via KeyExtractor
      const keyResult = Essentia.KeyExtractor(signalVector, true, 4096, 4096, 12, 3500, 60, 25, 0.2, 'bgate', sampleRate)
      const key = keyResult?.key
      const scale = keyResult?.scale
      if (key && scale) {
        detectedKey.value = scale === 'minor' ? `${key}m` : key
        console.log('Detected key:', detectedKey.value)
      }

      // Chords (and key/strength) via TonalExtractor – one chord per hop (2048 samples)
      const tonal = Essentia.TonalExtractor(signalVector, 4096, TONAL_HOP_SIZE, 440)
      const chordsProgression = tonal?.chords_progression ?? tonal?.chordsProgression
      const chordsStrength = tonal?.chords_strength ?? tonal?.chordsStrength
      const secondsPerChord = TONAL_HOP_SIZE / sampleRate
      const segments = buildChordSegments(chordsProgression, chordsStrength, secondsPerChord)
      detectedChords.value = segments
      if (segments.length > 0) {
        console.log('Chords:', segments.length, 'segments, first:', segments[0].chord.fullName, '@', segments[0].startTime.toFixed(1) + 's')
      } else if (chordsProgression != null || chordsStrength != null) {
        console.warn('TonalExtractor returned chord data but buildChordSegments produced none. progression length:', toArray(chordsProgression).length, 'strength length:', toArray(chordsStrength).length)
      }

      // Prefer key from TonalExtractor if we didn’t get it from KeyExtractor
      if (!detectedKey.value && tonal?.key_key) {
        const k = tonal.key_key
        const s = tonal.key_scale
        detectedKey.value = s === 'minor' ? `${k}m` : k
      }

      console.log('Analysis summary:', {
        tempo: detectedTempo.value,
        key: detectedKey.value,
        chordsCount: detectedChords.value.length
      })

      await tempContext.close()
    } catch (err) {
      console.error('Error analyzing chords:', err)
    } finally {
      isAnalyzing.value = false
    }
  }

  watch(
    () => getValue(audioFile),
    (newFile, oldFile) => {
      if (!newFile || newFile !== oldFile) {
        detectedChords.value = []
        detectedTempo.value = null
        detectedKey.value = null
        isAnalyzing.value = false
      }
    }
  )

  return {
    detectedChords,
    detectedTempo,
    detectedKey,
    isAnalyzing,
    analyzeChords
  }
}
