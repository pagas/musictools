import { ref, onUnmounted, watch } from 'vue'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './useAuth'

export function useSongs() {
  const { user } = useAuth()
  const songs = ref([])
  const loading = ref(true)
  let unsubscribe = null

  // Load songs from Firestore for the current user
  const loadSongs = () => {
    // Clean up existing listener
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }

    if (!user.value) {
      songs.value = []
      loading.value = false
      return
    }

    loading.value = true

    try {
      // Set up real-time listener for user's songs
      // Note: If you get an index error, create a composite index in Firestore
      // for (userId, createdAt)
      const q = query(
        collection(db, 'songs'),
        where('userId', '==', user.value.uid),
        orderBy('createdAt', 'desc')
      )

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          songs.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          loading.value = false
        },
        (error) => {
          console.error('Error loading songs:', error)
          // Clean up the failed listener
          if (unsubscribe) {
            unsubscribe()
            unsubscribe = null
          }
          
          // If ordering fails, try without orderBy
          if (error.code === 'failed-precondition') {
            console.warn('Index not found, loading without orderBy')
            const qSimple = query(
              collection(db, 'songs'),
              where('userId', '==', user.value.uid)
            )
            unsubscribe = onSnapshot(
              qSimple,
              (snapshot) => {
                songs.value = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })).sort((a, b) => {
                  // Sort by createdAt if available, otherwise by id
                  const aTime = a.createdAt?.toMillis?.() || 0
                  const bTime = b.createdAt?.toMillis?.() || 0
                  return bTime - aTime
                })
                loading.value = false
              },
              (err) => {
                console.error('Error loading songs (fallback):', err)
                loading.value = false
                // Clean up on error
                if (unsubscribe) {
                  unsubscribe()
                  unsubscribe = null
                }
              }
            )
          } else {
            loading.value = false
          }
        }
      )
    } catch (error) {
      console.error('Error setting up songs listener:', error)
      loading.value = false
    }
  }

  // Watch for user changes and reload songs
  watch(() => user.value, (newUser, oldUser) => {
    if (newUser?.uid !== oldUser?.uid) {
      // Small delay to ensure previous cleanup completes
      setTimeout(() => {
        loadSongs()
      }, 0)
    }
  }, { immediate: true })

  // Create a new song
  const createSong = async (songData) => {
    if (!user.value) {
      throw new Error('User must be authenticated to create songs')
    }

    try {
      const songWithMetadata = {
        ...songData,
        userId: user.value.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'songs'), songWithMetadata)
      return { success: true, id: docRef.id }
    } catch (error) {
      console.error('Error creating song:', error)
      return { success: false, error: error.message }
    }
  }

  // Update an existing song
  const updateSong = async (songId, updates) => {
    if (!user.value) {
      throw new Error('User must be authenticated to update songs')
    }

    try {
      const songRef = doc(db, 'songs', songId)
      await updateDoc(songRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return { success: true }
    } catch (error) {
      console.error('Error updating song:', error)
      return { success: false, error: error.message }
    }
  }

  // Delete a song
  const deleteSong = async (songId) => {
    if (!user.value) {
      throw new Error('User must be authenticated to delete songs')
    }

    try {
      await deleteDoc(doc(db, 'songs', songId))
      return { success: true }
    } catch (error) {
      console.error('Error deleting song:', error)
      return { success: false, error: error.message }
    }
  }

  // Cleanup listener on unmount
  onUnmounted(() => {
    if (unsubscribe) {
      try {
        unsubscribe()
      } catch (error) {
        console.error('Error unsubscribing from songs listener:', error)
      }
      unsubscribe = null
    }
  })

  return {
    songs,
    loading,
    loadSongs,
    createSong,
    updateSong,
    deleteSong
  }
}
