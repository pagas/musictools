<template>
  <div class="container">
    <header>
      <h1>🎵 Music Tools</h1>
      <p class="subtitle">Upload and analyze or slow down your music</p>
    </header>

    <nav class="tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'slowdowner' }"
        @click="activeTab = 'slowdowner'"
      >
        🎚️ Slow Downer
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'analyzer' }"
        @click="activeTab = 'analyzer'"
      >
        🔍 Music Analyzer
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'multitrack' }"
        @click="activeTab = 'multitrack'"
      >
        🎛️ Multi-Track Editor
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'performance' }"
        @click="activeTab = 'performance'"
      >
        📜 Performance View
      </button>
    </nav>

    <main>
      <FileUpload
        v-if="!currentFile && activeTab !== 'multitrack' && activeTab !== 'performance'"
        @file-selected="handleFileSelected"
      />
      
      <div v-if="currentFile && activeTab !== 'multitrack' && activeTab !== 'performance'" class="file-info">
        <p><strong>Current file:</strong> <span>{{ currentFile.name }}</span></p>
        <button class="btn-change" @click="changeFile">Change File</button>
      </div>

      <MusicPlayer
        v-if="currentFile && activeTab === 'slowdowner'"
        :file="currentFile"
      />

      <MusicAnalyzer
        v-if="currentFile && activeTab === 'analyzer'"
        :file="currentFile"
      />

      <MultiTrackEditor
        v-if="activeTab === 'multitrack'"
      />

      <SongPerformanceView
        v-if="activeTab === 'performance'"
      />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FileUpload from './components/FileUpload.vue'
import MusicPlayer from './components/MusicPlayer.vue'
import MusicAnalyzer from './components/MusicAnalyzer.vue'
import MultiTrackEditor from './components/MultiTrackEditor.vue'
import SongPerformanceView from './components/SongPerformanceView.vue'

const currentFile = ref(null)
const activeTab = ref('slowdowner')

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
  min-height: 400px;
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

.tabs {
  display: flex;
  gap: 10px;
  padding: 0 40px;
  border-bottom: 2px solid #e0e0e0;
  background: #f8f9ff;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 15px 30px;
  font-size: 1em;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  top: 2px;
}

.tab-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.multitrack-wrapper {
  padding: 0;
  margin: -40px;
  min-height: 600px;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .container {
    border-radius: 0;
    margin: 0;
    max-width: 100%;
  }

  header {
    padding: 25px 20px;
  }

  header h1 {
    font-size: 2em;
  }

  .subtitle {
    font-size: 1em;
  }

  main {
    padding: 20px;
  }

  .file-info {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
    padding: 15px;
  }

  .file-info p {
    word-break: break-word;
  }

  .tabs {
    padding: 0 20px;
    flex-wrap: wrap;
  }

  .tab-btn {
    padding: 12px 20px;
    font-size: 0.9em;
  }
}

@media (max-width: 480px) {
  header {
    padding: 20px 15px;
  }

  header h1 {
    font-size: 1.5em;
  }

  .subtitle {
    font-size: 0.9em;
  }

  main {
    padding: 15px;
  }

  .file-info {
    padding: 12px;
  }

  .tabs {
    padding: 0 15px;
  }

  .tab-btn {
    padding: 10px 15px;
    font-size: 0.85em;
    flex: 1;
    min-width: 120px;
  }
}
</style>
