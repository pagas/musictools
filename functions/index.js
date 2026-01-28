const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

/**
 * Cloud Function to create a new user
 * Only accessible by authenticated admin users
 *
 * @param {Object} data - User data: { email, password, displayName, role }
 * @param {Object} context - Firebase callable function context
 * @returns {Object} { success: true, uid: string, email: string }
 */
exports.createUser = functions.region('us-central1').https.onCall(async (data, context) => {
  // Verify the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to create users'
    )
  }

  // Check if user is admin
  try {
    const adminDoc = await admin.firestore().collection('users').doc(context.auth.uid).get()
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can create users'
      )
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error
    }
    throw new functions.https.HttpsError(
      'internal',
      'Error checking admin status'
    )
  }

  const { email, password, displayName, role = 'user' } = data

  // Validate input
  if (!email || !password) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email and password are required'
    )
  }

  try {
    // Create user in Firebase Auth using Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || null
    })

    // Create user document in Firestore linked to Auth UID
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: displayName || null,
      role: role,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || null,
      role: role
    }
  } catch (error) {
    console.error('Error creating user:', error)
    let errorMessage = 'Failed to create user. Please try again.'

    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'An account with this email already exists.'
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.'
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'Password is too weak. Please use a stronger password.'
    } else if (error.message) {
      errorMessage = error.message
    }

    throw new functions.https.HttpsError('internal', errorMessage)
  }
})

/**
 * Cloud Function to copy a song to another user (admin only).
 * Creates a new song document owned by the target user with the same content.
 *
 * @param {Object} data - { songId: string, targetUserId: string }
 * @param {Object} context - Firebase callable function context
 * @returns {Object} { success: true, newSongId: string }
 */
exports.copySongToUser = functions.region('us-central1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    )
  }

  try {
    const adminDoc = await admin.firestore().collection('users').doc(context.auth.uid).get()
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can copy songs to users'
      )
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error
    throw new functions.https.HttpsError('internal', 'Error checking admin status')
  }

  const { songId, targetUserId } = data
  if (!songId || !targetUserId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'songId and targetUserId are required'
    )
  }

  const db = admin.firestore()
  const songRef = db.collection('songs').doc(songId)
  const songSnap = await songRef.get()
  if (!songSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Song not found')
  }

  const songData = songSnap.data()
  const { userId, createdAt, updatedAt, ...songFields } = songData
  const newSong = {
    ...songFields,
    userId: targetUserId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }

  const newRef = await db.collection('songs').add(newSong)
  return { success: true, newSongId: newRef.id }
})
