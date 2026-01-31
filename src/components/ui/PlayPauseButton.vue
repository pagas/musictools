<template>
  <button
    type="button"
    class="play-pause-btn"
    :title="playing ? 'Pause' : 'Play'"
    :aria-label="playing ? 'Pause' : 'Play'"
    @click="$emit('click')"
  >
    <svg v-if="!playing" class="play-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
    <svg v-else class="pause-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  playing: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<style scoped>
.play-pause-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.4);
  flex-shrink: 0;
}

.play-pause-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.6);
}

.play-pause-btn:active {
  transform: scale(0.95);
}

.play-pause-btn .play-icon,
.play-pause-btn .pause-icon {
  width: 20px;
  height: 20px;
  color: white;
}
</style>
