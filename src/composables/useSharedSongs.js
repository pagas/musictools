import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './useAuth'

const SHARED_COLLECTION = 'shared_songs'

/** Simple short id for share URLs */
function generateShareId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let id = ''
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Create or update a public share for a song. Reuses existing shareId if the song already has one (stable link).
 * @param {Object} song - Song object (id, title, bpm, timeSignature, sections, instruments, metadata, etc.)
 * @param {string|null} selectedInstrument - Instrument filter to apply in the public preview (current UI selection)
 * @returns {Promise<{ success: boolean, shareId?: string, isNew?: boolean, error?: string }>}
 */
export async function createShare(song, selectedInstrument = null) {
  const { user } = useAuth()
  if (!user?.value) {
    return { success: false, error: 'Must be signed in to share' }
  }
  if (!song?.id || !song?.title || !song?.sections) {
    return { success: false, error: 'Invalid song' }
  }

  try {
    const { id, userId, createdAt, updatedAt, ...rest } = song
    const metadata = { ...(rest.metadata || {}) }
    if (selectedInstrument != null && selectedInstrument !== '') {
      metadata.selectedInstrument = selectedInstrument
    }
    const payload = {
      ...rest,
      metadata,
      sharedBy: user.value.uid,
      sharedAt: new Date().toISOString()
    }

    const existingShareId = song.metadata?.shareId
    if (existingShareId && typeof existingShareId === 'string' && existingShareId.trim() !== '') {
      const ref = doc(db, SHARED_COLLECTION, existingShareId.trim())
      await setDoc(ref, payload)
      return { success: true, shareId: existingShareId.trim(), isNew: false }
    }

    const shareId = generateShareId()
    const ref = doc(db, SHARED_COLLECTION, shareId)
    await setDoc(ref, payload)
    return { success: true, shareId, isNew: true }
  } catch (e) {
    console.error('createShare error:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Load a shared song by share id. Works without auth.
 * @param {string} shareId - Share id from URL
 * @returns {Promise<{ success: boolean, song?: Object, error?: string }>}
 */
export async function getSharedSong(shareId) {
  if (!shareId || typeof shareId !== 'string') {
    return { success: false, error: 'Invalid share id' }
  }
  try {
    const ref = doc(db, SHARED_COLLECTION, shareId)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      return { success: false, error: 'Link not found or expired' }
    }
    const data = snap.data()
    const song = {
      id: snap.id,
      title: data.title ?? 'Shared Song',
      bpm: data.bpm ?? 120,
      timeSignature: data.timeSignature ?? '4/4',
      key: data.key ?? 'C',
      chords: Array.isArray(data.chords) ? data.chords : [],
      instruments: data.instruments ?? ['Drums', 'Bass', 'Guitar', 'Keys'],
      sections: data.sections ?? [],
      metadata: data.metadata ?? {}
    }
    return { success: true, song }
  } catch (e) {
    console.error('getSharedSong error:', e)
    return { success: false, error: e.message }
  }
}
