import { ref, watch, onUnmounted } from 'vue'
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase/config'
import { useAuth } from './useAuth'

const COLLECTION = 'audio_files'

export function useAudioFiles() {
  const { user } = useAuth()
  const files = ref([])
  const loading = ref(true)
  let unsubscribe = null

  const loadFiles = async () => {
    if (!user.value?.uid) {
      files.value = []
      loading.value = false
      return
    }

    loading.value = true
    const userId = user.value.uid

    try {
      const q = query(
        collection(db, COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!user.value || user.value.uid !== userId) return
          files.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
          loading.value = false
        },
        (error) => {
          if (error.code === 'failed-precondition' && unsubscribe) {
            unsubscribe()
            unsubscribe = null
            // Try without orderBy if index missing
            const qSimple = query(
              collection(db, COLLECTION),
              where('userId', '==', userId)
            )
            unsubscribe = onSnapshot(
              qSimple,
              (snap) => {
                if (!user.value || user.value.uid !== userId) return
                files.value = snap.docs
                  .map((d) => ({ id: d.id, ...d.data() }))
                  .sort((a, b) => {
                    const aTime = a.createdAt?.toMillis?.() ?? 0
                    const bTime = b.createdAt?.toMillis?.() ?? 0
                    return bTime - aTime
                  })
                loading.value = false
              },
              (err) => {
                console.error('Error loading audio files:', err)
                loading.value = false
              }
            )
          } else {
            console.error('Error loading audio files:', error)
            loading.value = false
          }
        }
      )
    } catch (error) {
      console.error('Error setting up audio files listener:', error)
      loading.value = false
    }
  }

  watch(
    () => user.value?.uid,
    async (uid) => {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      if (!uid) {
        files.value = []
        loading.value = false
        return
      }
      await loadFiles()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })

  const uploadFile = async (file) => {
    if (!user.value) throw new Error('User must be authenticated to upload files')

    const userId = user.value.uid
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const safeName = (file.name || 'audio').replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `users/${userId}/audio/${uniqueId}_${safeName}`

    const sRef = storageRef(storage, path)
    await uploadBytes(sRef, file)
    const downloadUrl = await getDownloadURL(sRef)

    const docRef = await addDoc(collection(db, COLLECTION), {
      userId,
      name: file.name || 'Untitled',
      storagePath: path,
      downloadUrl,
      size: file.size,
      contentType: file.type || 'audio/mpeg',
      duration: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return { success: true, id: docRef.id }
  }

  const updateFileName = async (fileId, name) => {
    if (!user.value) throw new Error('User must be authenticated')

    const docRef = doc(db, COLLECTION, fileId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists() || docSnap.data().userId !== user.value.uid) {
      throw new Error('File not found')
    }

    await updateDoc(docRef, {
      name: name || 'Untitled',
      updatedAt: serverTimestamp()
    })
    return { success: true }
  }

  const deleteFile = async (fileId) => {
    if (!user.value) throw new Error('User must be authenticated')

    const docRef = doc(db, COLLECTION, fileId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists() || docSnap.data().userId !== user.value.uid) {
      throw new Error('File not found')
    }

    const data = docSnap.data()
    if (data.storagePath) {
      const sRef = storageRef(storage, data.storagePath)
      await deleteObject(sRef)
    }

    await deleteDoc(docRef)
    return { success: true }
  }

  const getDownloadUrl = (file) => {
    return file?.downloadUrl || null
  }

  return {
    files,
    loading,
    loadFiles,
    uploadFile,
    updateFileName,
    deleteFile,
    getDownloadUrl
  }
}
