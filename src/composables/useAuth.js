import { ref } from 'vue'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

// Shared state
const user = ref(null)
const loading = ref(true)

// Initialize auth state listener
onAuthStateChanged(auth, async (firebaseUser) => {
  const previousUser = user.value
  user.value = firebaseUser
  
  // Update user document in Firestore if it exists (sync email/displayName)
  // Only do this if user actually changed to avoid unnecessary Firestore operations
  if (firebaseUser && (!previousUser || previousUser.uid !== firebaseUser.uid)) {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid)
      const userDoc = await getDoc(userDocRef)
      
      // Double-check user hasn't changed during async operation
      if (user.value?.uid !== firebaseUser.uid) {
        return
      }
      
      if (userDoc.exists()) {
        // Update email/displayName if they've changed
        const currentData = userDoc.data()
        const updates = {}
        if (currentData.email !== firebaseUser.email) {
          updates.email = firebaseUser.email
        }
        if (currentData.displayName !== firebaseUser.displayName) {
          updates.displayName = firebaseUser.displayName || null
        }
        
        if (Object.keys(updates).length > 0) {
          // Verify user still matches before updating
          if (user.value?.uid === firebaseUser.uid) {
            await updateDoc(userDocRef, updates)
          }
        }
      }
      // Note: We do NOT create user documents here on login.
      // User documents should only be created by:
      // 1. Admin via Cloud Function (createUser)
      // 2. User signup via signUpWithEmail (which already creates it)
    } catch (error) {
      // Ignore errors if user changed during operation
      if (user.value?.uid === firebaseUser.uid) {
        console.error('Error syncing user data:', error)
      }
    }
  }
  
  loading.value = false
})

export function useAuth() {
  // Sign in with email and password
  const signInWithEmail = async (email, password) => {
    try {
      loading.value = true
      const result = await signInWithEmailAndPassword(auth, email, password)
      user.value = result.user
      return { success: true, user: result.user }
    } catch (error) {
      console.error('Error signing in:', error)
      let errorMessage = 'Failed to sign in. Please try again.'
      
      // Provide user-friendly error messages
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.'
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.'
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  // Sign up with email and password
  const signUpWithEmail = async (email, password) => {
    try {
      loading.value = true
      const result = await createUserWithEmailAndPassword(auth, email, password)
      user.value = result.user
      
      // Create user document in Firestore with default role
      const userDocRef = doc(db, 'users', result.user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email,
          displayName: result.user.displayName || null,
          role: 'user',
          createdAt: new Date().toISOString()
        })
      }
      
      return { success: true, user: result.user }
    } catch (error) {
      console.error('Error signing up:', error)
      let errorMessage = 'Failed to create account. Please try again.'
      
      // Provide user-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  // Update user profile (displayName, photoURL)
  const updateUserProfile = async ({ displayName, photoURL }) => {
    if (!auth.currentUser) {
      return { success: false, error: 'No user logged in' }
    }
    try {
      const updates = {}
      if (displayName !== undefined) updates.displayName = displayName || null
      if (photoURL !== undefined) updates.photoURL = photoURL || null
      
      if (Object.keys(updates).length === 0) {
        return { success: true, user: auth.currentUser }
      }

      await updateProfile(auth.currentUser, updates)
      user.value = auth.currentUser

      // Sync to Firestore users collection (displayName only - email/photoURL managed by Auth)
      if (updates.displayName !== undefined) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          await updateDoc(userDocRef, { displayName: updates.displayName })
        }
      }

      return { success: true, user: auth.currentUser }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }
  }

  // Sign out
  const logout = async () => {
    try {
      loading.value = true
      await signOut(auth)
      user.value = null
      return { success: true }
    } catch (error) {
      console.error('Error signing out:', error)
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    updateUserProfile,
    logout,
    isAuthenticated: () => !!user.value
  }
}
