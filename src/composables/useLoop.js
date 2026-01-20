import { ref, computed, watch } from 'vue'
import { formatTime, parseTimeInput } from '../utils/timeFormat'

export function useLoop(audioPlayer, duration) {
  const loopStart = ref(null)
  const loopEnd = ref(null)
  const loopEnabled = ref(false)
  const loopStartInput = ref('')
  const loopEndInput = ref('')
  const isEditingStart = ref(false)
  const isEditingEnd = ref(false)
  const lastLoopJump = ref(0)

  const isLoopValid = computed(() => {
    return loopStart.value !== null && loopEnd.value !== null && loopEnd.value > loopStart.value
  })

  const setLoopStart = () => {
    if (audioPlayer.value && duration.value > 0) {
      const time = audioPlayer.value.currentTime
      loopStart.value = time
      loopStartInput.value = formatTime(time)
      
      // If loop end exists and is before new start, clear it
      if (loopEnd.value !== null && loopEnd.value <= time) {
        loopEnd.value = null
        loopEndInput.value = ''
        loopEnabled.value = false
      }
    }
  }

  const setLoopEnd = () => {
    if (audioPlayer.value && duration.value > 0) {
      const time = audioPlayer.value.currentTime
      
      // Loop end must be after loop start
      if (loopStart.value !== null && time > loopStart.value) {
        loopEnd.value = time
        loopEndInput.value = formatTime(time)
      } else if (loopStart.value === null) {
        alert('Please set loop start first, or the end will be ignored.')
        return
      } else {
        alert('Loop end must be after loop start.')
        return
      }
    }
  }

  const clearLoop = () => {
    loopStart.value = null
    loopEnd.value = null
    loopEnabled.value = false
    loopStartInput.value = ''
    loopEndInput.value = ''
  }

  const handleLoopStartInput = (event) => {
    isEditingStart.value = true
    loopStartInput.value = event.target.value
  }

  const handleLoopEndInput = (event) => {
    isEditingEnd.value = true
    loopEndInput.value = event.target.value
  }

  const applyLoopStartInput = () => {
    isEditingStart.value = false
    if (!duration.value) return
    
    const time = parseTimeInput(loopStartInput.value)
    
    if (time === null) {
      if (loopStart.value !== null) {
        loopStartInput.value = formatTime(loopStart.value)
      } else {
        loopStartInput.value = ''
      }
      return
    }
    
    const validTime = Math.max(0, Math.min(time, duration.value))
    
    if (loopEnd.value !== null && loopEnd.value <= validTime) {
      alert('Loop start must be before loop end.')
      loopStartInput.value = loopStart.value !== null ? formatTime(loopStart.value) : ''
      return
    }
    
    loopStart.value = validTime
    loopStartInput.value = formatTime(validTime)
  }

  const applyLoopEndInput = () => {
    isEditingEnd.value = false
    if (!duration.value) return
    
    const time = parseTimeInput(loopEndInput.value)
    
    if (time === null) {
      if (loopEnd.value !== null) {
        loopEndInput.value = formatTime(loopEnd.value)
      } else {
        loopEndInput.value = ''
      }
      return
    }
    
    const validTime = Math.max(0, Math.min(time, duration.value))
    
    if (loopStart.value !== null && validTime <= loopStart.value) {
      alert('Loop end must be after loop start.')
      loopEndInput.value = loopEnd.value !== null ? formatTime(loopEnd.value) : ''
      return
    }
    
    loopEnd.value = validTime
    loopEndInput.value = formatTime(validTime)
  }

  const incrementLoopStart = () => {
    if (loopStart.value === null || !duration.value) return
    const newTime = Math.min(loopStart.value + 1, loopEnd.value !== null ? loopEnd.value - 0.1 : duration.value)
    loopStart.value = Math.max(0, newTime)
    loopStartInput.value = formatTime(loopStart.value)
  }

  const decrementLoopStart = () => {
    if (loopStart.value === null || loopStart.value <= 0) return
    loopStart.value = Math.max(0, loopStart.value - 1)
    loopStartInput.value = formatTime(loopStart.value)
  }

  const incrementLoopStartMs = () => {
    if (loopStart.value === null || !duration.value) return
    const increment = 0.1
    const newTime = Math.min(loopStart.value + increment, loopEnd.value !== null ? loopEnd.value - 0.001 : duration.value)
    loopStart.value = Math.max(0, newTime)
    loopStartInput.value = formatTime(loopStart.value)
  }

  const decrementLoopStartMs = () => {
    if (loopStart.value === null || loopStart.value <= 0) return
    const decrement = 0.1
    loopStart.value = Math.max(0, loopStart.value - decrement)
    loopStartInput.value = formatTime(loopStart.value)
  }

  const incrementLoopEnd = () => {
    if (loopEnd.value === null || !duration.value) return
    const maxTime = duration.value
    if (loopEnd.value >= maxTime - 0.1) return
    loopEnd.value = Math.min(loopEnd.value + 1, maxTime)
    loopEndInput.value = formatTime(loopEnd.value)
  }

  const decrementLoopEnd = () => {
    if (loopEnd.value === null) return
    const minTime = loopStart.value !== null ? loopStart.value + 0.1 : 0
    if (loopEnd.value <= minTime) return
    loopEnd.value = Math.max(minTime, loopEnd.value - 1)
    loopEndInput.value = formatTime(loopEnd.value)
  }

  const incrementLoopEndMs = () => {
    if (loopEnd.value === null || !duration.value) return
    const increment = 0.1
    const maxTime = duration.value
    if (loopEnd.value >= maxTime - 0.001) return
    loopEnd.value = Math.min(loopEnd.value + increment, maxTime)
    loopEndInput.value = formatTime(loopEnd.value)
  }

  const decrementLoopEndMs = () => {
    if (loopEnd.value === null) return
    const decrement = 0.1
    const minTime = loopStart.value !== null ? loopStart.value + 0.001 : 0
    if (loopEnd.value <= minTime) return
    loopEnd.value = Math.max(minTime, loopEnd.value - decrement)
    loopEndInput.value = formatTime(loopEnd.value)
  }

  // Update input values when loop points change (but not if editing)
  watch([loopStart, duration], () => {
    if (!isEditingStart.value) {
      if (loopStart.value !== null) {
        loopStartInput.value = formatTime(loopStart.value)
      } else {
        loopStartInput.value = ''
      }
    }
  }, { immediate: true })

  watch([loopEnd, duration], () => {
    if (!isEditingEnd.value) {
      if (loopEnd.value !== null) {
        loopEndInput.value = formatTime(loopEnd.value)
      } else {
        loopEndInput.value = ''
      }
    }
  }, { immediate: true })

  // Disable loop if it becomes invalid
  watch([loopStart, loopEnd], () => {
    if (!isLoopValid.value) {
      loopEnabled.value = false
    }
  })

  // Reset when duration changes to null
  watch(() => duration.value, (newDuration) => {
    if (!newDuration) {
      clearLoop()
    }
  })

  return {
    loopStart,
    loopEnd,
    loopEnabled,
    loopStartInput,
    loopEndInput,
    isEditingStart,
    isEditingEnd,
    lastLoopJump,
    isLoopValid,
    setLoopStart,
    setLoopEnd,
    clearLoop,
    handleLoopStartInput,
    handleLoopEndInput,
    applyLoopStartInput,
    applyLoopEndInput,
    incrementLoopStart,
    decrementLoopStart,
    incrementLoopStartMs,
    decrementLoopStartMs,
    incrementLoopEnd,
    decrementLoopEnd,
    incrementLoopEndMs,
    decrementLoopEndMs
  }
}
