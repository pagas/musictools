/**
 * Format time in seconds to MM:SS.ms format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "1:23.5")
 */
export function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00.0'
  const totalSeconds = Math.floor(seconds)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  const ms = Math.floor((seconds % 1) * 1000)
  
  // Always show milliseconds (as tenths of a second, 0-9)
  const msTenths = Math.floor(ms / 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${msTenths}`
}

/**
 * Parse time input (supports MM:SS, MM:SS.m, MM:SS.ms format or plain seconds)
 * @param {string} input - Time string input
 * @returns {number|null} Time in seconds or null if invalid
 */
export function parseTimeInput(input) {
  if (!input || input.trim() === '') return null
  
  const trimmed = input.trim()
  
  // Try MM:SS.ms or MM:SS.m format
  const timeMatch = trimmed.match(/^(\d+):(\d+)\.?(\d*)$/)
  if (timeMatch) {
    const mins = parseInt(timeMatch[1], 10)
    const secs = parseInt(timeMatch[2], 10)
    const msStr = timeMatch[3] || '0'
    
    // Handle milliseconds (can be 1 digit for tenths or 2-3 digits)
    let ms = 0
    if (msStr.length === 1) {
      ms = parseInt(msStr, 10) * 100 // Convert tenths to milliseconds
    } else if (msStr.length === 2) {
      ms = parseInt(msStr, 10) * 10 // Convert hundredths to milliseconds
    } else {
      ms = parseInt(msStr.substring(0, 3), 10) // Take first 3 digits
    }
    
    return mins * 60 + secs + ms / 1000
  }
  
  // Try MM:SS format
  const colonMatch = trimmed.match(/^(\d+):(\d+)$/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    return mins * 60 + secs
  }
  
  // Try plain seconds (including decimals)
  const seconds = parseFloat(trimmed)
  if (!isNaN(seconds)) {
    return seconds
  }
  
  return null
}
