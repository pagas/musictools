import { ref, computed, watch } from 'vue'

export function useWaveform(audioPlayer, file, duration, currentTime, loopStart, loopEnd, zoomLevel, zoomOffset, canvasRef, wrapperRef) {
  // Use provided refs (even if null initially) or create new ones
  // This ensures Vue's template refs are properly connected
  const waveformCanvas = canvasRef !== undefined ? canvasRef : ref(null)
  const progressWrapper = wrapperRef !== undefined ? wrapperRef : ref(null)
  const audioContext = ref(null)
  const waveformData = ref(null)
  const isClick = ref(false)
  const clickStartTime = ref(0)

  // Helper to get value from ref or getter function
  const getValue = (refOrGetter) => {
    if (typeof refOrGetter === 'function') {
      return refOrGetter()
    }
    // Handle Vue refs
    if (refOrGetter && typeof refOrGetter === 'object' && 'value' in refOrGetter) {
      const val = refOrGetter.value
      // Handle NaN - return 0 for numeric refs that are NaN
      if (typeof val === 'number' && isNaN(val)) {
        return 0
      }
      return val
    }
    return refOrGetter
  }

  // Computed properties for visible time range
  const visibleStartTime = computed(() => {
    const durationVal = getValue(duration)
    if (!durationVal) return 0
    const zoomLevelVal = getValue(zoomLevel)
    const zoomOffsetVal = getValue(zoomOffset)
    const visDur = durationVal / zoomLevelVal
    const maxOffset = Math.max(0, durationVal - visDur)
    return Math.max(0, Math.min(maxOffset, zoomOffsetVal))
  })

  const visibleEndTime = computed(() => {
    const durationVal = getValue(duration)
    if (!durationVal) return 0
    return visibleStartTime.value + (durationVal / getValue(zoomLevel))
  })

  const visibleDurationTime = computed(() => {
    const durationVal = getValue(duration)
    if (!durationVal) return 0
    return durationVal / getValue(zoomLevel)
  })

  // Initialize audio context for waveform preprocessing
  const initAudioContext = () => {
    const fileObj = getValue(file)
    
    if (!waveformCanvas.value) return
    if (!fileObj || !(fileObj instanceof File)) return
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!audioContext.value) {
        audioContext.value = new AudioContextClass()
      }
      preprocessWaveform()
    } catch (error) {
      console.error('Error initializing audio context:', error)
    }
  }

  // Pre-process waveform data for visualization
  const preprocessWaveform = async () => {
    const fileObj = getValue(file)
    const durationVal = getValue(duration)
    
    if (!durationVal || durationVal <= 0) return
    if (!audioContext.value) return
    if (!fileObj || !(fileObj instanceof File)) return
    
    try {
      const arrayBuffer = await fileObj.arrayBuffer()
      const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
      
      const rawData = audioBuffer.getChannelData(0)
      const samples = 500
      const blockSize = Math.floor(rawData.length / samples)
      const filteredData = []
      
      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j])
        }
        filteredData.push(sum / blockSize)
      }
      
      const max = Math.max(...filteredData)
      if (max > 0) {
        waveformData.value = filteredData.map(n => n / max)
      } else {
        waveformData.value = filteredData
      }
      
      // Wait for canvas to be ready, then draw
      let attempts = 0
      const maxAttempts = 50
      const attemptDraw = () => {
        attempts++
        const durationValCurrent = getValue(duration)
        if (waveformCanvas.value && durationValCurrent && waveformData.value) {
          if (waveformCanvas.value.offsetWidth > 0 && waveformCanvas.value.offsetHeight > 0) {
            drawWaveform()
            return
          }
        }
        
        if (attempts < maxAttempts) {
          requestAnimationFrame(attemptDraw)
        }
      }
      requestAnimationFrame(attemptDraw)
    } catch (error) {
      console.error('Error preprocessing waveform:', error)
    }
  }

  // Draw waveform on canvas with zoom support
  const drawWaveform = () => {
    const durationVal = getValue(duration)
    const zoomLevelVal = getValue(zoomLevel)
    const zoomOffsetVal = getValue(zoomOffset)
    const currentTimeVal = getValue(currentTime)
    const loopStartVal = getValue(loopStart)
    const loopEndVal = getValue(loopEnd)
    
    if (!waveformCanvas.value || !durationVal || durationVal <= 0) return
    if (!zoomLevelVal || zoomLevelVal <= 0) return
    
    const canvas = waveformCanvas.value
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width = canvas.offsetWidth
    const height = canvas.height = canvas.offsetHeight
    
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#f0f2ff'
    ctx.fillRect(0, 0, width, height)
    
    const visibleDuration = durationVal / zoomLevelVal
    const maxOffset = Math.max(0, durationVal - visibleDuration)
    // Ensure zoomOffsetVal is a valid number (not NaN)
    const validZoomOffset = (typeof zoomOffsetVal === 'number' && !isNaN(zoomOffsetVal)) ? zoomOffsetVal : 0
    const clampedOffset = Math.max(0, Math.min(maxOffset, validZoomOffset))
    const visibleStart = clampedOffset
    const visibleEnd = Math.min(durationVal, clampedOffset + visibleDuration)
    const timeToPixel = width / visibleDuration
    
    // Draw waveform
    if (waveformData.value && waveformData.value.length > 0) {
      const centerY = height / 2
      const sampleDuration = durationVal / waveformData.value.length
      
      // Clamp visible range to valid bounds for sample calculation
      const clampedVisibleStart = Math.max(0, Math.min(durationVal, visibleStart))
      const clampedVisibleEnd = Math.max(0, Math.min(durationVal, visibleEnd))
      
      const startSample = Math.max(0, Math.floor(clampedVisibleStart / sampleDuration))
      const endSample = Math.min(waveformData.value.length, Math.ceil(clampedVisibleEnd / sampleDuration))
      const samplesToDraw = endSample - startSample
      
      if (samplesToDraw > 0 && startSample >= 0 && endSample <= waveformData.value.length && startSample < endSample) {
        const barWidth = Math.max(1, width / samplesToDraw)
        
        ctx.fillStyle = '#667eea'
        ctx.strokeStyle = '#667eea'
        ctx.lineWidth = 1
        
        for (let i = startSample; i < endSample; i++) {
          const value = waveformData.value[i]
          if (value > 0) {
            const barHeight = Math.max(1, value * centerY * 0.8)
            const sampleTime = i * sampleDuration
            // Use visibleStart (not clamped) for x calculation to match the timeToPixel calculation
            const x = (sampleTime - visibleStart) * timeToPixel
            
            if (x >= -barWidth && x <= width + barWidth) {
              ctx.beginPath()
              ctx.moveTo(x, centerY - barHeight)
              ctx.lineTo(x, centerY + barHeight)
              ctx.stroke()
            }
          }
        }
      }
    }
    
    // Draw progress indicator
    if (currentTimeVal > 0 && durationVal > 0) {
      let progressX = 0
      
      if (currentTimeVal >= visibleStart && currentTimeVal <= visibleEnd) {
        progressX = (currentTimeVal - visibleStart) * timeToPixel
      } else if (currentTimeVal < visibleStart) {
        progressX = 0
      } else {
        progressX = width
      }
      
      ctx.fillStyle = 'rgba(118, 75, 162, 0.3)'
      ctx.fillRect(0, 0, Math.max(0, progressX), height)
      
      if (progressX >= 0 && progressX <= width) {
        ctx.strokeStyle = '#764ba2'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(progressX, 0)
        ctx.lineTo(progressX, height)
        ctx.stroke()
      }
    }
    
    // Draw loop markers
    if (loopStartVal !== null && durationVal > 0) {
      let startX = 0
      if (loopStartVal >= visibleStart && loopStartVal <= visibleEnd) {
        startX = (loopStartVal - visibleStart) * timeToPixel
      } else if (loopStartVal < visibleStart) {
        startX = -5
      } else {
        startX = width + 5
      }
      
      if (startX >= -10 && startX <= width + 10) {
        ctx.strokeStyle = '#51cf66'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(startX, 0)
        ctx.lineTo(startX, height)
        ctx.stroke()
      }
    }
    
    if (loopEndVal !== null && durationVal > 0) {
      let endX = 0
      if (loopEndVal >= visibleStart && loopEndVal <= visibleEnd) {
        endX = (loopEndVal - visibleStart) * timeToPixel
      } else if (loopEndVal < visibleStart) {
        endX = -5
      } else {
        endX = width + 5
      }
      
      if (endX >= -10 && endX <= width + 10) {
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(endX, 0)
        ctx.lineTo(endX, height)
        ctx.stroke()
      }
    }
    
    // Draw loop range highlight
    if (loopStartVal !== null && loopEndVal !== null && durationVal > 0) {
      const startX = Math.max(0, (loopStartVal - visibleStart) * timeToPixel)
      const endX = Math.min(width, (loopEndVal - visibleStart) * timeToPixel)
      
      if (endX > startX) {
        ctx.fillStyle = 'rgba(102, 126, 234, 0.2)'
        ctx.fillRect(startX, 0, endX - startX, height)
      }
    }
  }

  // Handle canvas click - seek to clicked position
  const handleCanvasClick = (event) => {
    const durationVal = getValue(duration)
    const zoomLevelVal = getValue(zoomLevel)
    const zoomOffsetVal = getValue(zoomOffset)
    const audioPlayerEl = getValue(audioPlayer)
    
    if (!waveformCanvas.value || !durationVal || !audioPlayerEl || !event) return
    
    const canvas = waveformCanvas.value
    const rect = canvas.getBoundingClientRect()
    // Handle both mouse and touch events
    let clientX
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX
    } else if (event.clientX !== undefined) {
      clientX = event.clientX
    } else {
      return // No valid clientX found
    }
    const x = clientX - rect.left
    
    const visibleDuration = durationVal / zoomLevelVal
    const maxOffset = Math.max(0, durationVal - visibleDuration)
    const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffsetVal))
    const pixelToTime = visibleDuration / rect.width
    const clickTime = clampedOffset + (x * pixelToTime)
    const validTime = Math.max(0, Math.min(durationVal, clickTime))
    
    audioPlayerEl.currentTime = validTime
  }

  // Handle mouse down on canvas
  const handleCanvasMouseDown = (event) => {
    const durationVal = getValue(duration)
    if (!waveformCanvas.value || !durationVal) return
    isClick.value = true
    clickStartTime.value = Date.now()
    event.preventDefault()
  }

  // Handle mouse move on canvas
  const handleCanvasMouseMove = (event) => {
    const durationVal = getValue(duration)
    if (!waveformCanvas.value || !durationVal) return
    
    if (isClick.value && clickStartTime.value > 0) {
      const timeSinceStart = Date.now() - clickStartTime.value
      if (timeSinceStart > 200) {
        // Consider it might be a drag
      }
    }
    
    if (waveformCanvas.value) {
      waveformCanvas.value.style.cursor = 'pointer'
    }
  }

  // Handle mouse up on canvas
  const handleCanvasMouseUp = () => {
    setTimeout(() => {
      isClick.value = false
    }, 50)
  }

  // Get time from position (for loop markers)
  // Note: progressWrapper should be passed from component
  const getTimeFromPosition = (clientX, progressWrapperRef) => {
    const wrapper = progressWrapperRef || progressWrapper.value
    const durationVal = getValue(duration)
    const zoomLevelVal = getValue(zoomLevel)
    const zoomOffsetVal = getValue(zoomOffset)
    
    if (!wrapper || !durationVal) return null
    
    const rect = wrapper.getBoundingClientRect()
    const x = clientX - rect.left
    const visibleDuration = durationVal / zoomLevelVal
    const maxOffset = Math.max(0, durationVal - visibleDuration)
    const clampedOffset = Math.max(0, Math.min(maxOffset, zoomOffsetVal))
    const pixelToTime = visibleDuration / rect.width
    return clampedOffset + (x * pixelToTime)
  }

  // Redraw waveform when dependencies change
  watch([() => getValue(currentTime), () => getValue(loopStart), () => getValue(loopEnd), () => getValue(zoomLevel), () => getValue(zoomOffset), () => getValue(duration), waveformData], () => {
    if (waveformData.value && waveformCanvas.value && getValue(duration)) {
      drawWaveform()
    }
  })

  // Cleanup
  const cleanup = () => {
    waveformData.value = null
    if (audioContext.value) {
      audioContext.value.close().catch(() => {})
      audioContext.value = null
    }
  }
  
  // Reset waveform data when file changes
  watch(() => getValue(file), (newFile, oldFile) => {
    if (newFile !== oldFile) {
      waveformData.value = null
      if (audioContext.value) {
        audioContext.value.close().catch(() => {})
        audioContext.value = null
      }
    }
  })

  return {
    waveformCanvas,
    progressWrapper,
    audioContext,
    waveformData,
    visibleStartTime,
    visibleEndTime,
    visibleDurationTime,
    initAudioContext,
    preprocessWaveform,
    drawWaveform,
    handleCanvasClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    getTimeFromPosition,
    cleanup
  }
}
