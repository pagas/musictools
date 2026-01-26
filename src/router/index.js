import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/slowdowner'
  },
  {
    path: '/slowdowner',
    name: 'slowdowner',
    component: { template: '<div></div>' }
  },
  {
    path: '/analyzer',
    name: 'analyzer',
    component: { template: '<div></div>' }
  },
  {
    path: '/performance',
    name: 'performance',
    component: { template: '<div></div>' },
    meta: { requiresAuth: true }
  },
  {
    path: '/multitrack',
    name: 'multitrack',
    component: { template: '<div></div>' },
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../components/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for admin routes
router.beforeEach(async (to, from, next) => {
  if (to.meta?.requiresAdmin) {
    try {
      // Import useAdmin dynamically to avoid circular dependencies
      const { useAdmin } = await import('../composables/useAdmin')
      const { isAdmin, initializeUserRole } = useAdmin()
      
      // Check if user is authenticated
      const { useAuth } = await import('../composables/useAuth')
      const { isAuthenticated, user } = useAuth()
      
      if (!isAuthenticated() || !user.value) {
        next('/slowdowner')
        return
      }
      
      // Initialize user role and check admin status
      await initializeUserRole()
      
      // Wait a bit for computed to update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!isAdmin.value) {
        next('/slowdowner')
        return
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
      next('/slowdowner')
      return
    }
  }
  
  next()
})

export default router
