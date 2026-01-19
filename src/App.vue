<template>
  <div class="container">
    <header>
      <h1>🎵 Music Player</h1>
      <p class="subtitle">Upload and control your music playback speed</p>
    </header>

    <main>
      <FileUpload
        v-if="!currentFile"
        @file-selected="handleFileSelected"
      />
      
      <div v-else class="file-info">
        <p><strong>Current file:</strong> <span>{{ currentFile.name }}</span></p>
        <button class="btn-change" @click="changeFile">Change File</button>
      </div>

      <MusicPlayer
        v-if="currentFile"
        :file="currentFile"
      />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FileUpload from './components/FileUpload.vue'
import MusicPlayer from './components/MusicPlayer.vue'

const currentFile = ref(null)

const handleFileSelected = (file) => {
  currentFile.value = file
}

const changeFile = () => {
  currentFile.value = null
}
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  text-align: center;
}

header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  font-weight: 700;
}

.subtitle {
  opacity: 0.9;
  font-size: 1.1em;
}

main {
  padding: 40px;
}

.file-info {
  background: #f0f2ff;
  padding: 20px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.file-info p {
  margin: 0;
  color: #333;
}

.file-info span {
  color: #667eea;
  font-weight: 600;
}

.btn-change {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-change:hover {
  background: #764ba2;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}
</style>
