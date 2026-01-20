# Music Player Refactoring Guide

## Overview
The MusicPlayer.vue component (2590 lines) has been refactored into smaller, focused components following Vue 3 best practices.

## New Structure

### Composables (`src/composables/`)
Shared, reusable logic extracted from components:

1. **useAudio.js** - Audio playback management
   - Play/pause control
   - Volume control
   - Playback speed
   - Seeking
   - Time tracking

2. **useNoteDetection.js** - Note detection functionality
   - Audio analysis setup
   - Pitch detection (FFT-based)
   - Frequency to note conversion
   - Detection start/stop

3. **useWaveform.js** (to be created) - Waveform visualization
   - Waveform preprocessing
   - Canvas drawing
   - Zoom and pan functionality

4. **useLoop.js** (to be created) - Loop management
   - Loop start/end markers
   - Loop validation
   - Time input parsing
   - Loop increment/decrement

### Components (`src/components/`)

1. **PlaybackControls.vue** ✅ - Play/pause button and time display
2. **NoteDetector.vue** ✅ - Note detection status display
3. **VolumeControl.vue** ✅ - Volume slider
4. **SpeedControls.vue** ✅ - Playback speed controls
5. **WaveformViewer.vue** (to be created) - Waveform canvas with zoom/pan
6. **LoopControls.vue** (to be created) - Loop management UI

### Utils (`src/utils/`)

1. **timeFormat.js** ✅ - Time formatting and parsing utilities

## Benefits

1. **Separation of Concerns** - Each component has a single responsibility
2. **Reusability** - Composables can be reused across components
3. **Testability** - Smaller units are easier to test
4. **Maintainability** - Easier to find and fix bugs
5. **Readability** - Smaller files are easier to understand

## Next Steps

1. Create `useWaveform.js` and `useLoop.js` composables
2. Create `WaveformViewer.vue` and `LoopControls.vue` components
3. Refactor `MusicPlayer.vue` to use all new components
4. Move remaining styles to component-scoped stylesheets
