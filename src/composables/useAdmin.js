import { ref, computed } from 'vue'
import { collection, query, getDocs, doc, updateDoc, getDoc, setDoc, deleteDoc, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../firebase/config'
import { useAuth } from './useAuth'

const { user } = useAuth()

// Cache for user roles
const userRolesCache = ref({})
const usersList = ref([])
const loadingUsers = ref(false)

// Check if current user is admin
export const isAdmin = computed(() => {
  if (!user.value) return false
  const userRole = userRolesCache.value[user.value.uid]
  return userRole === 'admin'
})

// Get user role from Firestore
export const getUserRole = async (userId) => {
  // Check cache first
  if (userRolesCache.value[userId]) {
    return userRolesCache.value[userId]
  }

  try {
    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)
    
    if (userDoc.exists()) {
      const role = userDoc.data().role || 'user'
      userRolesCache.value[userId] = role
      return role
    } else {
      // User doesn't exist in users collection, create with default role
      await setDoc(userDocRef, { role: 'user' })
      userRolesCache.value[userId] = 'user'
      return 'user'
    }
  } catch (error) {
    console.error('Error getting user role:', error)
    return 'user' // Default to user on error
  }
}

// Update user role
export const updateUserRole = async (userId, newRole) => {
  try {
    const userDocRef = doc(db, 'users', userId)
    await updateDoc(userDocRef, { role: newRole })
    userRolesCache.value[userId] = newRole
    
    // Update in users list
    const userIndex = usersList.value.findIndex(u => u.uid === userId)
    if (userIndex !== -1) {
      usersList.value[userIndex].role = newRole
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error updating user role:', error)
    return { success: false, error: error.message }
  }
}

// Get all users from Firestore users collection
export const fetchUsers = async () => {
  loadingUsers.value = true
  try {
    const usersCollection = collection(db, 'users')
    const usersSnapshot = await getDocs(usersCollection)
    
    const users = []
    usersSnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data()
      users.push({
        uid: docSnapshot.id,
        email: data.email || docSnapshot.id,
        displayName: data.displayName || null,
        role: data.role || 'user',
        createdAt: data.createdAt || null
      })
    })
    
    // Sort by email
    users.sort((a, b) => {
      const emailA = (a.email || '').toLowerCase()
      const emailB = (b.email || '').toLowerCase()
      return emailA.localeCompare(emailB)
    })
    
    usersList.value = users
    
    // Update cache
    users.forEach(user => {
      if (user.role) {
        userRolesCache.value[user.uid] = user.role
      }
    })
    
    return { success: true, users }
  } catch (error) {
    console.error('Error fetching users:', error)
    return { success: false, error: error.message }
  } finally {
    loadingUsers.value = false
  }
}

// Create a new user
// Note: This only creates a user document in Firestore with pending status
// The user will need to sign up with the same email/password to activate their account
// For full user creation with Firebase Auth, you would need a backend/Cloud Function using Admin SDK
export const createUser = async (email, password, displayName, role = 'user') => {
  try {
    // Check if user already exists in Firestore
    const usersCollection = collection(db, 'users')
    const usersSnapshot = await getDocs(usersCollection)
    
    const existingUser = usersSnapshot.docs.find(doc => {
      const data = doc.data()
      return data.email && data.email.toLowerCase() === email.toLowerCase()
    })
    
    if (existingUser) {
      return { 
        success: false, 
        error: 'An account with this email already exists.' 
      }
    }
    
    // Generate a temporary UID (we'll use a timestamp-based ID)
    // When the user actually signs up, their real UID will be used
    const tempUid = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create user document in Firestore with pending status
    // Store password hash hint (in production, you'd want to hash this properly)
    // For now, we'll just mark it as pending and the user will sign up normally
    const userDocRef = doc(db, 'users', tempUid)
    await setDoc(userDocRef, {
      email: email.toLowerCase(),
      displayName: displayName || null,
      role: role,
      status: 'pending', // User needs to sign up to activate
      createdAt: new Date().toISOString(),
      // Note: In production, you should NOT store passwords in Firestore
      // This is a temporary solution - the user will need to sign up with this password
      // For production, use Firebase Admin SDK on a backend to create users properly
    })
    
    // Add to cache
    userRolesCache.value[tempUid] = role
    
    // Add to users list
    usersList.value.push({
      uid: tempUid,
      email: email,
      displayName: displayName || null,
      role: role,
      status: 'pending',
      createdAt: new Date().toISOString()
    })
    
    // Sort users list by email
    usersList.value.sort((a, b) => {
      const emailA = (a.email || '').toLowerCase()
      const emailB = (b.email || '').toLowerCase()
      return emailA.localeCompare(emailB)
    })
    
    return { 
      success: true, 
      user: { uid: tempUid, email, displayName, role },
      message: 'User created. They will need to sign up with this email and password to activate their account.'
    }
  } catch (error) {
    console.error('Error creating user:', error)
    let errorMessage = 'Failed to create user. Please try again.'
    
    if (error.message) {
      errorMessage = error.message
    }
    
    return { success: false, error: errorMessage }
  }
}

// Delete user from Firestore
export const deleteUser = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId)
    await deleteDoc(userDocRef)
    
    // Remove from cache
    delete userRolesCache.value[userId]
    
    // Remove from users list
    const userIndex = usersList.value.findIndex(u => u.uid === userId)
    if (userIndex !== -1) {
      usersList.value.splice(userIndex, 1)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: error.message }
  }
}

// Initialize current user's role
export const initializeUserRole = async () => {
  if (user.value) {
    await getUserRole(user.value.uid)
  }
}

export function useAdmin() {
  return {
    isAdmin,
    getUserRole,
    updateUserRole,
    createUser,
    deleteUser,
    fetchUsers,
    usersList,
    loadingUsers,
    initializeUserRole
  }
}
