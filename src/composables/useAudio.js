import { ref, computed, watch } from 'vue'

export function useAudio(file) {
  const audioPlayer = ref(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(100)
  const currentSpeed = ref(1)
  const currentPitch = ref(0) // Pitch in semitones

  const audioUrl = computed(() => {
    return file.value ? URL.createObjectURL(file.value) : ''
  })

  const togglePlayPause = () => {
    if (audioPlayer.value) {
      if (audioPlayer.value.paused) {
        audioPlayer.value.play()
      } else {
        audioPlayer.value.pause()
      }
    }
  }

  const setPlaybackSpeed = (speed) => {
    currentSpeed.value = speed
    // Pitch will be applied via watch in MusicPlayer component
    // Don't set playbackRate here to avoid conflicts
  }

  const setPitch = (semitones) => {
    currentPitch.value = semitones
    // Pitch is handled via Web Audio API in MusicPlayer component
    // This just stores the value
  }

  const updateVolume = (newVolume) => {
    volume.value = newVolume
    if (audioPlayer.value) {
      audioPlayer.value.volume = newVolume / 100
    }
  }

  const seek = (time) => {
    if (audioPlayer.value) {
      audioPlayer.value.currentTime = Math.max(0, Math.min(duration.value, time))
    }
  }

  const handleLoadedMetadata = () => {
    if (audioPlayer.value) {
      duration.value = audioPlayer.value.duration
    }
  }

  const handleTimeUpdate = () => {
    if (audioPlayer.value) {
      currentTime.value = audioPlayer.value.currentTime
    }
  }

  const handlePlay = () => {
    isPlaying.value = true
  }

  const handlePause = () => {
    isPlaying.value = false
  }

  // Reset when file changes
  watch(() => file.value, () => {
    isPlaying.value = false
    currentSpeed.value = 1
    currentPitch.value = 0
    currentTime.value = 0
    volume.value = 100
    if (audioPlayer.value) {
      audioPlayer.value.playbackRate = 1
      audioPlayer.value.volume = 1
    }
  })

  return {
    audioPlayer,
    isPlaying,
    currentTime,
    duration,
    volume,
    currentSpeed,
    currentPitch,
    audioUrl,
    togglePlayPause,
    setPlaybackSpeed,
    setPitch,
    updateVolume,
    seek,
    handleLoadedMetadata,
    handleTimeUpdate,
    handlePlay,
    handlePause
  }
}
