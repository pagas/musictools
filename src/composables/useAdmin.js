import { ref, computed } from 'vue'
import { collection, query, getDocs, doc, updateDoc, getDoc, setDoc, deleteDoc, where } from 'firebase/firestore'
import { db } from '../firebase/config'
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
    deleteUser,
    fetchUsers,
    usersList,
    loadingUsers,
    initializeUserRole
  }
}
