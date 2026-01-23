import { ref } from 'vue'

export function usePitchShifter(audioContext, sourceNode) {
  const delayNode1 = ref(null)
  const delayNode2 = ref(null)
  const gainNode1 = ref(null)
  const gainNode2 = ref(null)
  const crossfadeGain1 = ref(null)
  const crossfadeGain2 = ref(null)
  const outputGain = ref(null)
  const isActive = ref(false)
  
  let delayTime1 = 0.02 // 20ms initial delay
  let delayTime2 = 0.02
  let delayIncrement = 0
  let crossfadePhase = 0
  let animationFrameId = null

  // Initialize pitch shifter nodes
  const init = () => {
    if (!audioContext.value || !sourceNode.value) return

    try {
      // Create delay nodes (max delay 0.1 seconds)
      delayNode1.value = audioContext.value.createDelay(0.1)
      delayNode2.value = audioContext.value.createDelay(0.1)
      delayNode1.value.delayTime.value = delayTime1
      delayNode2.value.delayTime.value = delayTime2

      // Create gain nodes for crossfading
      crossfadeGain1.value = audioContext.value.createGain()
      crossfadeGain2.value = audioContext.value.createGain()
      gainNode1.value = audioContext.value.createGain()
      gainNode2.value = audioContext.value.createGain()
      outputGain.value = audioContext.value.createGain()

      // Set initial gains
      crossfadeGain1.value.gain.value = 1
      crossfadeGain2.value.gain.value = 0

      // Connect: source -> delay1/delay2 -> crossfade -> gain -> output
      sourceNode.value.connect(delayNode1.value)
      sourceNode.value.connect(delayNode2.value)
      
      delayNode1.value.connect(crossfadeGain1.value)
      delayNode2.value.connect(crossfadeGain2.value)
      
      crossfadeGain1.value.connect(gainNode1.value)
      crossfadeGain2.value.connect(gainNode2.value)
      
      gainNode1.value.connect(outputGain.value)
      gainNode2.value.connect(outputGain.value)

      isActive.value = true
    } catch (error) {
      console.error('Error initializing pitch shifter:', error)
      isActive.value = false
    }
  }

  // Set pitch in semitones
  const setPitch = (semitones) => {
    if (!isActive.value || !audioContext.value) return

    if (semitones === 0) {
      // Reset to no pitch shift
      delayIncrement = 0
      crossfadeGain1.value.gain.value = 1
      crossfadeGain2.value.gain.value = 0
      delayNode1.value.delayTime.value = delayTime1
      delayNode2.value.delayTime.value = delayTime2
      return
    }

    // Calculate delay increment based on pitch ratio
    const pitchRatio = Math.pow(2, semitones / 12)
    // For upward pitch shift, delay decreases
    // For downward pitch shift, delay increases
    const sampleRate = audioContext.value.sampleRate
    delayIncrement = (1 - pitchRatio) * 0.0001 // Small increment per sample

    // Start crossfading animation
    startCrossfade()
  }

  // Crossfade between delay channels
  const startCrossfade = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }

    const updateCrossfade = () => {
      if (!isActive.value || !delayNode1.value || !delayNode2.value) return

      const sampleRate = audioContext.value.sampleRate
      const updateInterval = 128 / sampleRate // Update every 128 samples

      // Update delay times
      delayTime1 += delayIncrement * 128
      delayTime2 += delayIncrement * 128

      // Wrap delay times
      if (delayTime1 < 0.01) {
        delayTime1 = 0.09
        delayTime2 = 0.01
        crossfadePhase = 0
      } else if (delayTime1 > 0.09) {
        delayTime1 = 0.01
        delayTime2 = 0.09
        crossfadePhase = Math.PI
      }

      delayNode1.value.delayTime.setValueAtTime(delayTime1, audioContext.value.currentTime)
      delayNode2.value.delayTime.setValueAtTime(delayTime2, audioContext.value.currentTime)

      // Update crossfade gains (sine wave crossfade)
      crossfadePhase += Math.PI * 0.01
      const gain1 = (Math.sin(crossfadePhase) + 1) / 2
      const gain2 = 1 - gain1

      crossfadeGain1.value.gain.setValueAtTime(gain1, audioContext.value.currentTime)
      crossfadeGain2.value.gain.setValueAtTime(gain2, audioContext.value.currentTime)

      animationFrameId = requestAnimationFrame(updateCrossfade)
    }

    updateCrossfade()
  }

  // Connect output to destination
  const connect = (destination) => {
    if (outputGain.value) {
      outputGain.value.connect(destination)
    }
  }

  // Disconnect
  const disconnect = () => {
    if (outputGain.value) {
      outputGain.value.disconnect()
    }
  }

  // Cleanup
  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (delayNode1.value) {
      delayNode1.value.disconnect()
      delayNode1.value = null
    }
    if (delayNode2.value) {
      delayNode2.value.disconnect()
      delayNode2.value = null
    }
    if (crossfadeGain1.value) {
      crossfadeGain1.value.disconnect()
      crossfadeGain1.value = null
    }
    if (crossfadeGain2.value) {
      crossfadeGain2.value.disconnect()
      crossfadeGain2.value = null
    }
    if (gainNode1.value) {
      gainNode1.value.disconnect()
      gainNode1.value = null
    }
    if (gainNode2.value) {
      gainNode2.value.disconnect()
      gainNode2.value = null
    }
    if (outputGain.value) {
      outputGain.value.disconnect()
      outputGain.value = null
    }

    isActive.value = false
  }

  return {
    init,
    setPitch,
    connect,
    disconnect,
    cleanup,
    getOutputNode: () => outputGain.value,
    isActive: () => isActive.value
  }
}
