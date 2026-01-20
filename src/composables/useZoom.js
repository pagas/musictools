import { ref, computed, watch } from 'vue'

export function useZoom(duration, loopStart, loopEnd) {
  const zoomLevel = ref(1)
  const zoomOffset = ref(0)

  // Helper to get duration value (handles both refs and getter functions)
  const getDuration = () => {
    if (typeof duration === 'function') {
      return duration()
    }
    return duration?.value ?? duration
  }

  // Scrollbar computed properties
  const scrollbarMax = computed(() => {
    const durationVal = getDuration()
    if (!durationVal || zoomLevel.value <= 1) return 0
    const visibleDuration = durationVal / zoomLevel.value
    const maxOffset = Math.max(0, durationVal - visibleDuration)
    return Math.max(0, Math.floor(maxOffset * 1000))
  })

  const scrollbarValue = computed(() => {
    const durationVal = getDuration()
    if (!durationVal || zoomLevel.value <= 1) return 0
    // Ensure zoomOffset is a valid number
    const validOffset = (typeof zoomOffset.value === 'number' && !isNaN(zoomOffset.value)) ? zoomOffset.value : 0
    return Math.floor(validOffset * 1000)
  })

  // Visible time range
  const visibleStartTime = computed(() => {
    const durationVal = getDuration()
    if (!durationVal) return 0
    const visDur = durationVal / zoomLevel.value
    const maxOffset = Math.max(0, durationVal - visDur)
    // Ensure zoomOffset is a valid number
    const validOffset = (typeof zoomOffset.value === 'number' && !isNaN(zoomOffset.value)) ? zoomOffset.value : 0
    return Math.max(0, Math.min(maxOffset, validOffset))
  })

  const visibleEndTime = computed(() => {
    const durationVal = getDuration()
    if (!durationVal) return 0
    const visDur = durationVal / zoomLevel.value
    return visibleStartTime.value + visDur
  })

  const visibleDurationTime = computed(() => {
    const durationVal = getDuration()
    if (!durationVal) return 0
    return durationVal / zoomLevel.value
  })

  const zoomIn = (drawWaveform) => {
    if (zoomLevel.value >= 10) return
    
    const oldZoom = zoomLevel.value
    zoomLevel.value = Math.min(10, zoomLevel.value * 1.5)
    
    // Ensure zoomOffset is valid before using it
    const currentOffset = (typeof zoomOffset.value === 'number' && !isNaN(zoomOffset.value)) ? zoomOffset.value : 0
    const centerTime = currentOffset + (duration.value / oldZoom / 2)
    const newVisibleDuration = duration.value / zoomLevel.value
    const newOffset = Math.max(0, Math.min(
      duration.value - newVisibleDuration,
      centerTime - newVisibleDuration / 2
    ))
    zoomOffset.value = newOffset
    
    if (drawWaveform) drawWaveform()
  }

  const zoomOut = (drawWaveform) => {
    if (zoomLevel.value <= 1) {
      resetZoom(drawWaveform)
      return
    }
    
    const durationVal = getDuration()
    const oldZoom = zoomLevel.value
    zoomLevel.value = Math.max(1, zoomLevel.value / 1.5)
    
    // Ensure zoomOffset is valid before using it
    const currentOffset = (typeof zoomOffset.value === 'number' && !isNaN(zoomOffset.value)) ? zoomOffset.value : 0
    const centerTime = currentOffset + (durationVal / oldZoom / 2)
    const newVisibleDuration = durationVal / zoomLevel.value
    const newOffset = Math.max(0, Math.min(
      durationVal - newVisibleDuration,
      centerTime - newVisibleDuration / 2
    ))
    zoomOffset.value = newOffset
    
    if (zoomLevel.value === 1) {
      zoomOffset.value = 0
    }
    
    if (drawWaveform) drawWaveform()
  }

  const resetZoom = (drawWaveform) => {
    zoomLevel.value = 1
    zoomOffset.value = 0
    if (drawWaveform) drawWaveform()
  }

  const zoomToLoop = (drawWaveform) => {
    const durationVal = getDuration()
    const loopStartVal = typeof loopStart === 'function' ? loopStart() : loopStart?.value
    const loopEndVal = typeof loopEnd === 'function' ? loopEnd() : loopEnd?.value
    
    if (loopStartVal === null || loopEndVal === null || !durationVal) return
    
    const loopDuration = loopEndVal - loopStartVal
    const centerTime = (loopStartVal + loopEndVal) / 2
    const padding = loopDuration * 0.2
    const targetVisibleDuration = loopDuration + padding
    zoomLevel.value = Math.min(10, Math.max(1, durationVal / targetVisibleDuration))
    
    const newVisibleDuration = durationVal / zoomLevel.value
    zoomOffset.value = Math.max(0, Math.min(
      durationVal - newVisibleDuration,
      centerTime - newVisibleDuration / 2
    ))
    
    if (drawWaveform) drawWaveform()
  }

  const handleWheelZoom = (event, waveformCanvas, drawWaveform) => {
    if (!waveformCanvas.value || !duration.value) return
    
    event.preventDefault()
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    
    if (delta > 1 && zoomLevel.value >= 10) return
    if (delta < 1 && zoomLevel.value <= 1) {
      const currentOffset = (typeof zoomOffset.value === 'number' && !isNaN(zoomOffset.value)) ? zoomOffset.value : 0
      if (currentOffset === 0) return
    }
    
    const oldZoom = zoomLevel.value
    zoomLevel.value = Math.max(1, Math.min(10, zoomLevel.value * delta))
    
    // Ensure zoomOffset is valid before using it
    const currentOffset = (typeof zoomOffset.value === 'number' && !isNaN(zoomOffset.value)) ? zoomOffset.value : 0
    
    if (delta > 1) {
      const rect = waveformCanvas.value.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseTime = currentOffset + (mouseX / rect.width) * (duration.value / oldZoom)
      
      const newVisibleDuration = duration.value / zoomLevel.value
      const maxOffset = Math.max(0, duration.value - newVisibleDuration)
      zoomOffset.value = Math.max(0, Math.min(maxOffset, mouseTime - (mouseX / rect.width) * newVisibleDuration))
    } else {
      const centerTime = currentOffset + (duration.value / oldZoom / 2)
      const newVisibleDuration = duration.value / zoomLevel.value
      zoomOffset.value = Math.max(0, Math.min(
        duration.value - newVisibleDuration,
        centerTime - newVisibleDuration / 2
      ))
    }
    
    if (zoomLevel.value === 1) {
      zoomOffset.value = 0
    }
    
    if (drawWaveform) drawWaveform()
  }

  const handleScrollbarInput = (event, drawWaveform) => {
    const durationVal = getDuration()
    if (!durationVal || zoomLevel.value <= 1) return
    
    const rawValue = parseFloat(event.target.value)
    if (isNaN(rawValue)) return
    
    const value = rawValue / 1000
    const visibleDuration = durationVal / zoomLevel.value
    const maxOffset = Math.max(0, durationVal - visibleDuration)
    
    const newOffset = Math.max(0, Math.min(maxOffset, value))
    zoomOffset.value = newOffset
    
    if (drawWaveform) drawWaveform()
  }

  // Reset when duration changes
  watch(() => getDuration(), (newDuration) => {
    if (!newDuration) {
      resetZoom()
    }
  })

  return {
    zoomLevel,
    zoomOffset,
    scrollbarMax,
    scrollbarValue,
    visibleStartTime,
    visibleEndTime,
    visibleDurationTime,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToLoop,
    handleWheelZoom,
    handleScrollbarInput
  }
}
