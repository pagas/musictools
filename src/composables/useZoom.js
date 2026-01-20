import { ref, computed, watch } from 'vue'

export function useZoom(duration, loopStart, loopEnd) {
  const zoomLevel = ref(1)
  const zoomOffset = ref(0)

  // Scrollbar computed properties
  const scrollbarMax = computed(() => {
    if (!duration.value || zoomLevel.value <= 1) return 0
    const visibleDuration = duration.value / zoomLevel.value
    const maxOffset = Math.max(0, duration.value - visibleDuration)
    return Math.max(0, Math.floor(maxOffset * 1000))
  })

  const scrollbarValue = computed(() => {
    if (!duration.value || zoomLevel.value <= 1) return 0
    return Math.floor(zoomOffset.value * 1000)
  })

  // Visible time range
  const visibleStartTime = computed(() => {
    if (!duration.value) return 0
    const visDur = duration.value / zoomLevel.value
    const maxOffset = Math.max(0, duration.value - visDur)
    return Math.max(0, Math.min(maxOffset, zoomOffset.value))
  })

  const visibleEndTime = computed(() => {
    if (!duration.value) return 0
    const visDur = duration.value / zoomLevel.value
    return visibleStartTime.value + visDur
  })

  const visibleDurationTime = computed(() => {
    if (!duration.value) return 0
    return duration.value / zoomLevel.value
  })

  const zoomIn = (drawWaveform) => {
    if (zoomLevel.value >= 10) return
    
    const oldZoom = zoomLevel.value
    zoomLevel.value = Math.min(10, zoomLevel.value * 1.5)
    
    const centerTime = zoomOffset.value + (duration.value / oldZoom / 2)
    const newVisibleDuration = duration.value / zoomLevel.value
    zoomOffset.value = Math.max(0, Math.min(
      duration.value - newVisibleDuration,
      centerTime - newVisibleDuration / 2
    ))
    
    if (drawWaveform) drawWaveform()
  }

  const zoomOut = (drawWaveform) => {
    if (zoomLevel.value <= 1) {
      resetZoom(drawWaveform)
      return
    }
    
    const oldZoom = zoomLevel.value
    zoomLevel.value = Math.max(1, zoomLevel.value / 1.5)
    
    const centerTime = zoomOffset.value + (duration.value / oldZoom / 2)
    const newVisibleDuration = duration.value / zoomLevel.value
    zoomOffset.value = Math.max(0, Math.min(
      duration.value - newVisibleDuration,
      centerTime - newVisibleDuration / 2
    ))
    
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
    if (loopStart.value === null || loopEnd.value === null || !duration.value) return
    
    const loopDuration = loopEnd.value - loopStart.value
    const centerTime = (loopStart.value + loopEnd.value) / 2
    const padding = loopDuration * 0.2
    const targetVisibleDuration = loopDuration + padding
    zoomLevel.value = Math.min(10, Math.max(1, duration.value / targetVisibleDuration))
    
    const newVisibleDuration = duration.value / zoomLevel.value
    zoomOffset.value = Math.max(0, Math.min(
      duration.value - newVisibleDuration,
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
      if (zoomOffset.value === 0) return
    }
    
    const oldZoom = zoomLevel.value
    zoomLevel.value = Math.max(1, Math.min(10, zoomLevel.value * delta))
    
    if (delta > 1) {
      const rect = waveformCanvas.value.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseTime = zoomOffset.value + (mouseX / rect.width) * (duration.value / oldZoom)
      
      const newVisibleDuration = duration.value / zoomLevel.value
      const maxOffset = Math.max(0, duration.value - newVisibleDuration)
      zoomOffset.value = Math.max(0, Math.min(maxOffset, mouseTime - (mouseX / rect.width) * newVisibleDuration))
    } else {
      const centerTime = zoomOffset.value + (duration.value / oldZoom / 2)
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
    if (!duration.value || zoomLevel.value <= 1) return
    
    const value = parseFloat(event.target.value) / 1000
    const visibleDuration = duration.value / zoomLevel.value
    const maxOffset = Math.max(0, duration.value - visibleDuration)
    
    zoomOffset.value = Math.max(0, Math.min(maxOffset, value))
    if (drawWaveform) drawWaveform()
  }

  // Reset when duration changes
  watch(() => duration.value, (newDuration) => {
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
